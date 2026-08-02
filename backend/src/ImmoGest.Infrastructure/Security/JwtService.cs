using ImmoGest.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ImmoGest.Infrastructure.Security;

/// <summary>
/// Service JWT : génération des access tokens et refresh tokens.
/// </summary>
public class JwtService : IJwtService
{
    private readonly IConfiguration _config;
    private readonly byte[] _keyBytes;

    public JwtService(IConfiguration config)
    {
        _config = config;
        var secret = config["JWT:Secret"]
            ?? throw new InvalidOperationException("JWT:Secret non configuré.");
        _keyBytes = Encoding.UTF8.GetBytes(secret);
    }

    /// <summary>
    /// Génère un JWT Access Token signé (HS256) contenant les claims utilisateur.
    /// </summary>
    public string GenerateAccessToken(Guid userId, string email, string role)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role,               role),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,   DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
        };

        var expirationHours = int.Parse(_config["JWT:ExpirationHours"] ?? "24");
        var key  = new SymmetricSecurityKey(_keyBytes);
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:   _config["JWT:Issuer"],
            audience: _config["JWT:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddHours(expirationHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Génère un Refresh Token cryptographiquement sécurisé (256 bits).
    /// </summary>
    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public bool ValidateRefreshToken(string token) =>
        !string.IsNullOrEmpty(token) && token.Length >= 86;  // Base64 de 64 bytes

    /// <summary>
    /// Extrait les claims d'un token expiré (pour le refresh flow).
    /// </summary>
    public (Guid userId, string email, string role)? GetPrincipalFromExpiredToken(string token)
    {
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(_keyBytes),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = false     // On accepte les tokens expirés pour le refresh
        };

        try
        {
            var principal = new JwtSecurityTokenHandler()
                .ValidateToken(token, validationParams, out _);

            var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
            var email  = principal.FindFirstValue(JwtRegisteredClaimNames.Email)!;
            var role   = principal.FindFirstValue(ClaimTypes.Role)!;

            return (userId, email, role);
        }
        catch
        {
            return null;
        }
    }
}
