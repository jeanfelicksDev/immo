using ImmoGest.Application.DTOs;
using ImmoGest.Application.Interfaces;
using ImmoGest.Domain.Entities;
using ImmoGest.Domain.Enums;
using ImmoGest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace ImmoGest.Infrastructure.Services;

/// <summary>
/// Service d'authentification : login, register, refresh token.
/// Utilise BCrypt pour le hachage des mots de passe et JWT pour les tokens.
/// </summary>
public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;

    public AuthService(AppDbContext db, IJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.MotDePasse))
            throw new UnauthorizedAccessException("Veuillez saisir votre email et votre mot de passe.");

        var emailNorm = request.Email.Trim().ToLower();

        // Dictionnaire des comptes d'administration avec auto-provisioning
        var adminAccounts = new Dictionary<string, (string Nom, string Password)>
        {
            { "admin@immogest.com",    ("Administrateur Système", "Admin@2025!") },
            { "jeanfelicks@gmail.com", ("Jean Felicks (Admin)",   "admin") }
        };

        // Recherche par email insensible à la casse
        var user = await _db.Utilisateurs
            .FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm, ct);

        // Si le compte admin prédéfini n'existe pas en base, on le crée
        if (user is null && adminAccounts.TryGetValue(emailNorm, out var adminData))
        {
            user = new Utilisateur
            {
                NomComplet = adminData.Nom,
                Email      = emailNorm,
                MotDePasse = BCrypt.Net.BCrypt.HashPassword(adminData.Password, workFactor: 12),
                Role       = RoleUtilisateur.Administrateur,
                EstActif   = true
            };
            _db.Utilisateurs.Add(user);
            await _db.SaveChangesAsync(ct);
        }

        if (user is null)
            throw new UnauthorizedAccessException("Email ou mot de passe incorrect.");

        // Vérification du mot de passe
        bool isPasswordValid = false;
        try
        {
            isPasswordValid = BCrypt.Net.BCrypt.Verify(request.MotDePasse, user.MotDePasse);
        }
        catch
        {
            isPasswordValid = false;
        }

        // Auto-réparation si le mot de passe correspond au mot de passe connu des admins
        if (!isPasswordValid && adminAccounts.TryGetValue(emailNorm, out var knownData) && request.MotDePasse == knownData.Password)
        {
            user.MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse, workFactor: 12);
            user.EstActif   = true;
            user.Role       = RoleUtilisateur.Administrateur;
            await _db.SaveChangesAsync(ct);
            isPasswordValid = true;
        }

        if (!isPasswordValid)
            throw new UnauthorizedAccessException("Email ou mot de passe incorrect.");

        if (!user.EstActif)
            throw new UnauthorizedAccessException("Ce compte utilisateur a été désactivé.");

        return await GenerateAndSaveTokensAsync(user, ct);
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var emailNorm = request.Email.ToLower().Trim();

        if (await _db.Utilisateurs.AnyAsync(u => u.Email.ToLower() == emailNorm, ct))
            throw new InvalidOperationException($"Un compte existe déjà avec l'adresse {request.Email}.");

        var user = new Utilisateur
        {
            NomComplet = request.NomComplet.Trim(),
            Email      = emailNorm,
            MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse, workFactor: 12),
            Role       = request.Role
        };

        _db.Utilisateurs.Add(user);
        await _db.SaveChangesAsync(ct);

        return await GenerateAndSaveTokensAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var user = await _db.Utilisateurs
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken && u.EstActif, ct)
            ?? throw new UnauthorizedAccessException("Token de rafraîchissement invalide.");

        if (user.TokenExpiry < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Token de rafraîchissement expiré. Veuillez vous reconnecter.");

        return await GenerateAndSaveTokensAsync(user, ct);
    }

    public async Task RevokeTokenAsync(string email, CancellationToken ct = default)
    {
        var emailNorm = email.Trim().ToLower();
        var user = await _db.Utilisateurs.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm, ct);
        if (user is null) return;

        user.RefreshToken = null;
        user.TokenExpiry = null;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<AuthResponse> GenerateAndSaveTokensAsync(Utilisateur user, CancellationToken ct)
    {
        var accessToken  = _jwt.GenerateAccessToken(user.Id, user.Email, user.Role.ToString());
        var refreshToken = _jwt.GenerateRefreshToken();
        var expiresAt    = DateTime.UtcNow.AddDays(7);

        user.RefreshToken = refreshToken;
        user.TokenExpiry  = expiresAt;
        await _db.SaveChangesAsync(ct);

        return new AuthResponse(
            user.Id, user.NomComplet, user.Email, user.Role,
            accessToken, refreshToken, expiresAt
        );
    }
}
