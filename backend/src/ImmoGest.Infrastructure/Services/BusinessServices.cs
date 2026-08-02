using ImmoGest.Application.DTOs;
using ImmoGest.Application.Interfaces;
using ImmoGest.Domain.Entities;
using ImmoGest.Domain.Enums;
using ImmoGest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ImmoGest.Infrastructure.Services;

// ════════════════════════════════════════════════════════════════
// SERVICE : Dashboard
// ════════════════════════════════════════════════════════════════
public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    public DashboardService(AppDbContext db) => _db = db;

    public async Task<DashboardKpisDto> GetKpisAsync(Guid? proprietaireId = null, Guid? locataireId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default)
    {
        var propsQuery = _db.Proprietaires.Where(p => p.EstActif);
        if (proprietaireId.HasValue) propsQuery = propsQuery.Where(p => p.Id == proprietaireId.Value);
        var totalProprietaires = await propsQuery.CountAsync(ct);

        var locsQuery = _db.Locataires.Where(l => l.EstActif);
        if (locataireId.HasValue) locsQuery = locsQuery.Where(l => l.Id == locataireId.Value);
        var totalLocataires = await locsQuery.CountAsync(ct);

        var maisonsQuery = _db.Maisons.AsQueryable();
        if (proprietaireId.HasValue) maisonsQuery = maisonsQuery.Where(m => m.ProprietaireId == proprietaireId.Value);
        var totalMaisons = await maisonsQuery.CountAsync(ct);

        var souscriptionsQuery = _db.Souscriptions.Where(s => s.Statut == StatutSouscription.Active);
        if (proprietaireId.HasValue) souscriptionsQuery = souscriptionsQuery.Where(s => s.Maison.ProprietaireId == proprietaireId.Value);
        if (locataireId.HasValue) souscriptionsQuery = souscriptionsQuery.Where(s => s.LocataireId == locataireId.Value);
        if (dateDebut.HasValue) souscriptionsQuery = souscriptionsQuery.Where(s => s.DateSouscription >= dateDebut.Value);
        if (dateFin.HasValue) souscriptionsQuery = souscriptionsQuery.Where(s => s.DateSouscription <= dateFin.Value);

        var totalSouscriptions = await souscriptionsQuery.CountAsync(ct);

        var activeSouscriptions = await souscriptionsQuery
            .Select(s => new { s.MontantCaution, s.MontantAvance, s.MontantLoyer })
            .ToListAsync(ct);

        decimal totalCaution = 0m;
        decimal totalAvance  = 0m;
        decimal totalLoyer   = 0m;
        foreach (var s in activeSouscriptions)
        {
            totalCaution += s.MontantCaution;
            totalAvance  += s.MontantAvance;
            totalLoyer   += s.MontantLoyer;
        }

        var reglementsQuery = _db.Reglements.Where(r => r.Statut == StatutPaiement.EnAttente
                                                     || r.Statut == StatutPaiement.Partiel
                                                     || r.Statut == StatutPaiement.EnRetard);
        if (proprietaireId.HasValue) reglementsQuery = reglementsQuery.Where(r => r.Maison.ProprietaireId == proprietaireId.Value);
        if (locataireId.HasValue) reglementsQuery = reglementsQuery.Where(r => r.LocataireId == locataireId.Value);
        if (dateDebut.HasValue) reglementsQuery = reglementsQuery.Where(r => r.DatePaiement >= dateDebut.Value);
        if (dateFin.HasValue) reglementsQuery = reglementsQuery.Where(r => r.DatePaiement <= dateFin.Value);

        var reglementsImpayes = await reglementsQuery
            .Select(r => new { r.MontantAPayer, r.MontantPaye })
            .ToListAsync(ct);

        decimal totalImpaye = 0m;
        foreach (var r in reglementsImpayes)
        {
            totalImpaye += (r.MontantAPayer - r.MontantPaye);
        }

        return new DashboardKpisDto(
            totalProprietaires,
            totalLocataires,
            totalMaisons,
            totalSouscriptions,
            totalCaution,
            totalAvance,
            totalLoyer,
            totalImpaye
        );
    }
}

// ════════════════════════════════════════════════════════════════
// SERVICE : Propriétaires
// ════════════════════════════════════════════════════════════════
public class ProprietaireService : IProprietaireService
{
    private readonly AppDbContext _db;
    public ProprietaireService(AppDbContext db) => _db = db;

    private async Task<Guid?> ResolveUserId(Guid userId, CancellationToken ct)
    {
        if (userId != Guid.Empty && await _db.Utilisateurs.AnyAsync(u => u.Id == userId, ct)) return userId;
        var firstUser = await _db.Utilisateurs.Select(u => u.Id).FirstOrDefaultAsync(ct);
        return firstUser != Guid.Empty ? firstUser : null;
    }

    public async Task<PagedResult<ProprietaireDto>> GetAllAsync(PagedRequest req, CancellationToken ct = default)
    {
        var query = _db.Proprietaires
            .Include(p => p.Maisons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(req.Search))
            query = query.Where(p =>
                p.NomPrenoms.Contains(req.Search) ||
                (p.Email != null && p.Email.Contains(req.Search)) ||
                (p.Contact != null && p.Contact.Contains(req.Search)));

        query = req.SortBy switch
        {
            "nom"      => req.SortDesc ? query.OrderByDescending(p => p.NomPrenoms) : query.OrderBy(p => p.NomPrenoms),
            "created"  => req.SortDesc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
            _          => query.OrderBy(p => p.NomPrenoms)
        };

        var total = await query.CountAsync(ct);
        var entities = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var items = entities.Select(MapToDto).ToList();

        return new PagedResult<ProprietaireDto>(items, total, req.Page, req.PageSize,
            (int)Math.Ceiling(total / (double)req.PageSize));
    }

    public async Task<ProprietaireDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _db.Proprietaires.Include(x => x.Maisons).FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? null : MapToDto(p);
    }

    public async Task<ProprietaireDto> CreateAsync(CreateProprietaireRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = new Proprietaire
        {
            NomPrenoms = req.NomPrenoms.Trim(),
            Contact    = string.IsNullOrWhiteSpace(req.Contact) ? null : req.Contact.Trim(),
            Email      = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim().ToLower(),
            Adresse    = string.IsNullOrWhiteSpace(req.Adresse) ? null : req.Adresse.Trim(),
            Notes      = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedBy  = resolvedUserId,
            UpdatedBy  = resolvedUserId
        };

        _db.Proprietaires.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task<ProprietaireDto> UpdateAsync(Guid id, UpdateProprietaireRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = await _db.Proprietaires.Include(p => p.Maisons).FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException($"Propriétaire {id} introuvable.");

        entity.NomPrenoms = req.NomPrenoms.Trim();
        entity.Contact    = string.IsNullOrWhiteSpace(req.Contact) ? null : req.Contact.Trim();
        entity.Email      = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim().ToLower();
        entity.Adresse    = string.IsNullOrWhiteSpace(req.Adresse) ? null : req.Adresse.Trim();
        entity.Notes      = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        entity.EstActif   = req.EstActif;
        entity.UpdatedBy  = resolvedUserId;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Proprietaires.FindAsync(new object[] { id }, ct)
            ?? throw new KeyNotFoundException($"Propriétaire {id} introuvable.");

        if (await _db.Maisons.AnyAsync(m => m.ProprietaireId == id, ct))
            throw new InvalidOperationException("Impossible de supprimer : ce propriétaire possède des biens immobiliers.");

        _db.Proprietaires.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private static ProprietaireDto MapToDto(Proprietaire p) => new(
        p.Id, p.NomPrenoms, p.Contact, p.Email, p.Adresse, p.Notes, p.EstActif,
        p.Maisons.Count, p.CreatedAt, p.UpdatedAt
    );
}

// ════════════════════════════════════════════════════════════════
// SERVICE : Maisons
// ════════════════════════════════════════════════════════════════
public class MaisonService : IMaisonService
{
    private readonly AppDbContext _db;
    public MaisonService(AppDbContext db) => _db = db;

    private async Task<Guid?> ResolveUserId(Guid userId, CancellationToken ct)
    {
        if (userId != Guid.Empty && await _db.Utilisateurs.AnyAsync(u => u.Id == userId, ct)) return userId;
        var firstUser = await _db.Utilisateurs.Select(u => u.Id).FirstOrDefaultAsync(ct);
        return firstUser != Guid.Empty ? firstUser : null;
    }

    public async Task<PagedResult<MaisonDto>> GetAllAsync(PagedRequest req, bool? disponibleOnly = null, Guid? proprietaireId = null, CancellationToken ct = default)
    {
        var query = _db.Maisons
            .Include(m => m.Proprietaire)
            .AsQueryable();

        if (disponibleOnly.HasValue)
            query = query.Where(m => m.EstDisponible == disponibleOnly.Value);

        if (proprietaireId.HasValue)
            query = query.Where(m => m.ProprietaireId == proprietaireId.Value);

        if (!string.IsNullOrWhiteSpace(req.Search))
            query = query.Where(m =>
                m.Idm.Contains(req.Search) ||
                m.Ville.Contains(req.Search) ||
                m.Proprietaire.NomPrenoms.Contains(req.Search));

        query = req.SortBy switch
        {
            "idm"    => req.SortDesc ? query.OrderByDescending(m => m.Idm) : query.OrderBy(m => m.Idm),
            "ville"  => req.SortDesc ? query.OrderByDescending(m => m.Ville) : query.OrderBy(m => m.Ville),
            "loyer"  => req.SortDesc ? query.OrderByDescending(m => m.CoutLoyer) : query.OrderBy(m => m.CoutLoyer),
            _        => query.OrderBy(m => m.Idm)
        };

        var total = await query.CountAsync(ct);
        var entities = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var items = entities.Select(MapToDto).ToList();

        return new PagedResult<MaisonDto>(items, total, req.Page, req.PageSize,
            (int)Math.Ceiling(total / (double)req.PageSize));
    }

    public async Task<MaisonDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var m = await _db.Maisons.Include(x => x.Proprietaire).FirstOrDefaultAsync(x => x.Id == id, ct);
        return m is null ? null : MapToDto(m);
    }

    public async Task<MaisonDto?> GetByIdmAsync(string idm, CancellationToken ct = default)
    {
        var m = await _db.Maisons.Include(x => x.Proprietaire).FirstOrDefaultAsync(x => x.Idm == idm, ct);
        return m is null ? null : MapToDto(m);
    }

    public async Task<MaisonDto> CreateAsync(CreateMaisonRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var idm = !string.IsNullOrWhiteSpace(req.Idm)
            ? req.Idm.Trim()
            : await GenerateIdmAsync(req.TypeConstruction, req.NbPieces, req.CoutLoyer, req.Ville, ct);

        if (await _db.Maisons.AnyAsync(m => m.Idm == idm, ct))
            throw new InvalidOperationException($"L'IDM '{idm}' est déjà utilisé.");

        var entity = new Maison
        {
            Idm              = idm,
            ProprietaireId   = req.ProprietaireId,
            TypeConstruction = req.TypeConstruction,
            NbPieces         = req.NbPieces,
            CoutLoyer        = req.CoutLoyer,
            Ville            = req.Ville.Trim(),
            Quartier         = string.IsNullOrWhiteSpace(req.Quartier) ? null : req.Quartier.Trim(),
            AdresseComplete  = string.IsNullOrWhiteSpace(req.AdresseComplete) ? null : req.AdresseComplete.Trim(),
            Description      = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            CreatedBy        = resolvedUserId,
            UpdatedBy        = resolvedUserId
        };

        _db.Maisons.Add(entity);
        await _db.SaveChangesAsync(ct);

        await _db.Entry(entity).Reference(m => m.Proprietaire).LoadAsync(ct);
        return MapToDto(entity);
    }

    public async Task<MaisonDto> UpdateAsync(Guid id, UpdateMaisonRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = await _db.Maisons.Include(m => m.Proprietaire).FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException($"Maison {id} introuvable.");

        entity.ProprietaireId   = req.ProprietaireId;
        entity.TypeConstruction = req.TypeConstruction;
        entity.NbPieces         = req.NbPieces;
        entity.CoutLoyer        = req.CoutLoyer;
        entity.Ville            = req.Ville.Trim();
        entity.Quartier         = string.IsNullOrWhiteSpace(req.Quartier) ? null : req.Quartier.Trim();
        entity.AdresseComplete  = string.IsNullOrWhiteSpace(req.AdresseComplete) ? null : req.AdresseComplete.Trim();
        entity.Description      = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        entity.EstDisponible    = req.EstDisponible;
        entity.UpdatedBy        = resolvedUserId;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Maisons.FindAsync(new object[] { id }, ct)
            ?? throw new KeyNotFoundException($"Maison {id} introuvable.");

        if (await _db.Souscriptions.AnyAsync(s => s.MaisonId == id && s.Statut == StatutSouscription.Active, ct))
            throw new InvalidOperationException("Impossible de supprimer : ce bien possède un contrat de location actif.");

        // Nettoyage des dépenses associées au bien
        var depenses = await _db.Depenses.Where(d => d.MaisonId == id).ToListAsync(ct);
        if (depenses.Any()) _db.Depenses.RemoveRange(depenses);

        // Identifiants de toutes les souscriptions liées
        var souscriptionIds = await _db.Souscriptions
            .Where(s => s.MaisonId == id)
            .Select(s => s.Id)
            .ToListAsync(ct);

        // Nettoyage de tous les règlements liés au bien ou à ses souscriptions
        var reglements = await _db.Reglements
            .Where(r => r.MaisonId == id || souscriptionIds.Contains(r.SouscriptionId))
            .ToListAsync(ct);
        if (reglements.Any()) _db.Reglements.RemoveRange(reglements);

        // Nettoyage des souscriptions
        var souscriptions = await _db.Souscriptions.Where(s => s.MaisonId == id).ToListAsync(ct);
        if (souscriptions.Any()) _db.Souscriptions.RemoveRange(souscriptions);

        _db.Maisons.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<string> GenerateIdmAsync(TypeConstruction type, int nbPieces, decimal loyer, string ville, CancellationToken ct = default)
    {
        var prefix = type switch
        {
            TypeConstruction.MaisonBasse  => "MB",
            TypeConstruction.Appartement  => "AP",
            TypeConstruction.Villa        => "VL",
            TypeConstruction.Studio       => "ST",
            TypeConstruction.Duplex       => "DX",
            TypeConstruction.Bureau       => "BU",
            TypeConstruction.Commerce     => "CO",
            TypeConstruction.Entrepot     => "EN",
            _                             => "BI"
        };

        var villeCode = new string(ville
            .ToUpper()
            .Where(char.IsLetter)
            .Take(3)
            .ToArray());

        var seq = await _db.Maisons.CountAsync(ct) + 1;
        return $"{prefix}_P{nbPieces}_C{(int)loyer}_{villeCode}_{seq:D3}";
    }

    private static MaisonDto MapToDto(Maison m) => new(
        m.Id, m.Idm, m.ProprietaireId, m.Proprietaire?.NomPrenoms ?? "",
        m.TypeConstruction.ToString(), m.NbPieces, m.CoutLoyer,
        m.Ville, m.Quartier, m.AdresseComplete, m.Description,
        m.EstDisponible, m.CreatedAt, m.UpdatedAt
    );
}

// ════════════════════════════════════════════════════════════════
// SERVICE : Locataires
// ════════════════════════════════════════════════════════════════
public class LocataireService : ILocataireService
{
    private readonly AppDbContext _db;
    public LocataireService(AppDbContext db) => _db = db;

    private async Task<Guid?> ResolveUserId(Guid userId, CancellationToken ct)
    {
        if (userId != Guid.Empty && await _db.Utilisateurs.AnyAsync(u => u.Id == userId, ct)) return userId;
        var firstUser = await _db.Utilisateurs.Select(u => u.Id).FirstOrDefaultAsync(ct);
        return firstUser != Guid.Empty ? firstUser : null;
    }

    public async Task<PagedResult<LocataireDto>> GetAllAsync(PagedRequest req, CancellationToken ct = default)
    {
        var query = _db.Locataires
            .Include(l => l.Souscriptions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(req.Search))
            query = query.Where(l =>
                l.NomPrenoms.Contains(req.Search) ||
                (l.Email != null && l.Email.Contains(req.Search)) ||
                (l.Contact != null && l.Contact.Contains(req.Search)));

        query = req.SortDesc
            ? query.OrderByDescending(l => l.NomPrenoms)
            : query.OrderBy(l => l.NomPrenoms);

        var total = await query.CountAsync(ct);
        var entities = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var items = entities.Select(MapToDto).ToList();

        return new PagedResult<LocataireDto>(items, total, req.Page, req.PageSize,
            (int)Math.Ceiling(total / (double)req.PageSize));
    }

    public async Task<LocataireDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var l = await _db.Locataires.Include(x => x.Souscriptions).FirstOrDefaultAsync(x => x.Id == id, ct);
        return l is null ? null : MapToDto(l);
    }

    public async Task<LocataireDto> CreateAsync(CreateLocataireRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = new Locataire
        {
            NomPrenoms    = req.NomPrenoms.Trim(),
            Contact       = string.IsNullOrWhiteSpace(req.Contact) ? null : req.Contact.Trim(),
            Email         = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim().ToLower(),
            Adresse       = string.IsNullOrWhiteSpace(req.Adresse) ? null : req.Adresse.Trim(),
            PieceIdentite = string.IsNullOrWhiteSpace(req.PieceIdentite) ? null : req.PieceIdentite.Trim(),
            Profession    = string.IsNullOrWhiteSpace(req.Profession) ? null : req.Profession.Trim(),
            Notes         = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedBy     = resolvedUserId,
            UpdatedBy     = resolvedUserId
        };

        _db.Locataires.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task<LocataireDto> UpdateAsync(Guid id, UpdateLocataireRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = await _db.Locataires.Include(l => l.Souscriptions).FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw new KeyNotFoundException($"Locataire {id} introuvable.");

        entity.NomPrenoms    = req.NomPrenoms.Trim();
        entity.Contact       = string.IsNullOrWhiteSpace(req.Contact) ? null : req.Contact.Trim();
        entity.Email         = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim().ToLower();
        entity.Adresse       = string.IsNullOrWhiteSpace(req.Adresse) ? null : req.Adresse.Trim();
        entity.PieceIdentite = string.IsNullOrWhiteSpace(req.PieceIdentite) ? null : req.PieceIdentite.Trim();
        entity.Profession    = string.IsNullOrWhiteSpace(req.Profession) ? null : req.Profession.Trim();
        entity.Notes         = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        entity.EstActif      = req.EstActif;
        entity.UpdatedBy     = resolvedUserId;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Locataires.FindAsync(new object[] { id }, ct)
            ?? throw new KeyNotFoundException($"Locataire {id} introuvable.");

        if (await _db.Souscriptions.AnyAsync(s => s.LocataireId == id && s.Statut == StatutSouscription.Active, ct))
            throw new InvalidOperationException("Impossible de supprimer : ce locataire possède un contrat de location actif.");

        // Nettoyage des dépenses associées au locataire
        var depenses = await _db.Depenses.Where(d => d.LocataireId == id).ToListAsync(ct);
        if (depenses.Any()) _db.Depenses.RemoveRange(depenses);

        // Identifiants de toutes les souscriptions liées
        var souscriptionIds = await _db.Souscriptions
            .Where(s => s.LocataireId == id)
            .Select(s => s.Id)
            .ToListAsync(ct);

        // Nettoyage de tous les règlements liés au locataire ou à ses souscriptions
        var reglements = await _db.Reglements
            .Where(r => r.LocataireId == id || souscriptionIds.Contains(r.SouscriptionId))
            .ToListAsync(ct);
        if (reglements.Any()) _db.Reglements.RemoveRange(reglements);

        // Nettoyage des souscriptions
        var souscriptions = await _db.Souscriptions.Where(s => s.LocataireId == id).ToListAsync(ct);
        if (souscriptions.Any()) _db.Souscriptions.RemoveRange(souscriptions);

        _db.Locataires.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private static LocataireDto MapToDto(Locataire l) => new(
        l.Id, l.NomPrenoms, l.Contact, l.Email, l.Adresse,
        l.PieceIdentite, l.Profession, l.Notes, l.EstActif,
        l.Souscriptions.Count, l.CreatedAt, l.UpdatedAt
    );
}

// ════════════════════════════════════════════════════════════════
// SERVICE : Dépenses
// ════════════════════════════════════════════════════════════════
public class DepenseService : IDepenseService
{
    private readonly AppDbContext _db;
    private readonly string _uploadsPath;

    public DepenseService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _uploadsPath = config["UploadsPath"] ?? Path.Combine(AppContext.BaseDirectory, "uploads");
        Directory.CreateDirectory(_uploadsPath);
    }

    private async Task<Guid?> ResolveUserId(Guid userId, CancellationToken ct)
    {
        if (userId != Guid.Empty && await _db.Utilisateurs.AnyAsync(u => u.Id == userId, ct)) return userId;
        var firstUser = await _db.Utilisateurs.Select(u => u.Id).FirstOrDefaultAsync(ct);
        return firstUser != Guid.Empty ? firstUser : null;
    }

    public async Task<PagedResult<DepenseDto>> GetAllAsync(PagedRequest req, TypeDepense? type = null, Guid? proprietaireId = null, Guid? locataireId = null, Guid? maisonId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default)
    {
        var query = _db.Depenses
            .Include(d => d.Maison)
            .Include(d => d.Locataire)
            .AsQueryable();

        if (type.HasValue)
            query = query.Where(d => d.TypeDepense == type.Value);

        if (proprietaireId.HasValue)
            query = query.Where(d => d.Maison != null && d.Maison.ProprietaireId == proprietaireId.Value);

        if (locataireId.HasValue)
            query = query.Where(d => d.LocataireId == locataireId.Value);

        if (maisonId.HasValue)
            query = query.Where(d => d.MaisonId == maisonId.Value);

        if (dateDebut.HasValue)
            query = query.Where(d => d.DateDepense >= dateDebut.Value);

        if (dateFin.HasValue)
            query = query.Where(d => d.DateDepense <= dateFin.Value);

        if (!string.IsNullOrWhiteSpace(req.Search))
            query = query.Where(d => d.Article.Contains(req.Search));

        query = req.SortDesc
            ? query.OrderByDescending(d => d.DateDepense)
            : query.OrderByDescending(d => d.DateDepense);

        var total = await query.CountAsync(ct);
        var entities = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var items = entities.Select(MapToDto).ToList();

        return new PagedResult<DepenseDto>(items, total, req.Page, req.PageSize,
            (int)Math.Ceiling(total / (double)req.PageSize));
    }

    public async Task<DepenseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var d = await _db.Depenses.Include(x => x.Maison).Include(x => x.Locataire).FirstOrDefaultAsync(x => x.Id == id, ct);
        return d is null ? null : MapToDto(d);
    }

    public async Task<List<DepenseDto>> GetByMaisonAsync(Guid maisonId, CancellationToken ct = default)
    {
        var entities = await _db.Depenses.Include(d => d.Maison).Include(d => d.Locataire)
            .Where(d => d.MaisonId == maisonId)
            .OrderByDescending(d => d.DateDepense)
            .ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<List<DepenseDto>> GetByLocataireAsync(Guid locataireId, CancellationToken ct = default)
    {
        var entities = await _db.Depenses.Include(d => d.Maison).Include(d => d.Locataire)
            .Where(d => d.LocataireId == locataireId)
            .OrderByDescending(d => d.DateDepense)
            .ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<DepenseDto> CreateAsync(CreateDepenseRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);

        if (req.TypeDepense == TypeDepense.DepensesMaison && req.MaisonId is null)
            throw new ArgumentException("Une dépense de maison doit être associée à un bien.");

        if (req.TypeDepense == TypeDepense.ImputationLocataire && req.LocataireId is null)
            throw new ArgumentException("Une imputation locataire doit être associée à un locataire.");

        var entity = new Depense
        {
            TypeDepense         = req.TypeDepense,
            MaisonId            = req.MaisonId,
            LocataireId         = req.LocataireId,
            DateDepense         = req.DateDepense,
            Article             = req.Article.Trim(),
            Quantite            = req.Quantite,
            PrixUnitaire        = req.PrixUnitaire,
            Observation         = string.IsNullOrWhiteSpace(req.Observation) ? null : req.Observation.Trim(),
            PieceJustificative  = req.PieceJustificativeFileName,
            CreatedBy           = resolvedUserId,
            UpdatedBy           = resolvedUserId
        };

        _db.Depenses.Add(entity);
        await _db.SaveChangesAsync(ct);

        if (entity.MaisonId.HasValue)   await _db.Entry(entity).Reference(d => d.Maison).LoadAsync(ct);
        if (entity.LocataireId.HasValue) await _db.Entry(entity).Reference(d => d.Locataire).LoadAsync(ct);

        return MapToDto(entity);
    }

    public async Task<DepenseDto> UpdateAsync(Guid id, UpdateDepenseRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = await _db.Depenses.Include(d => d.Maison).Include(d => d.Locataire)
            .FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new KeyNotFoundException($"Dépense {id} introuvable.");

        entity.TypeDepense  = req.TypeDepense;
        entity.MaisonId     = req.MaisonId;
        entity.LocataireId  = req.LocataireId;
        entity.DateDepense  = req.DateDepense;
        entity.Article      = req.Article.Trim();
        entity.Quantite     = req.Quantite;
        entity.PrixUnitaire = req.PrixUnitaire;
        entity.Observation  = string.IsNullOrWhiteSpace(req.Observation) ? null : req.Observation.Trim();
        entity.UpdatedBy    = resolvedUserId;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Depenses.FindAsync(new object[] { id }, ct)
            ?? throw new KeyNotFoundException($"Dépense {id} introuvable.");

        _db.Depenses.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<string> UploadPieceJustificativeAsync(Guid depenseId, Stream fileStream, string fileName, CancellationToken ct = default)
    {
        var entity = await _db.Depenses.FindAsync(new object[] { depenseId }, ct)
            ?? throw new KeyNotFoundException($"Dépense {depenseId} introuvable.");

        var ext = Path.GetExtension(fileName);
        var safeName = $"pj_{depenseId:N}{ext}";
        var fullPath = Path.Combine(_uploadsPath, safeName);

        await using var fs = File.Create(fullPath);
        await fileStream.CopyToAsync(fs, ct);

        entity.PieceJustificative = safeName;
        await _db.SaveChangesAsync(ct);

        return safeName;
    }

    private static DepenseDto MapToDto(Depense d) => new(
        d.Id,
        d.TypeDepense.ToString(),
        d.MaisonId,
        d.Maison?.Idm,
        d.Maison?.Ville,
        d.LocataireId,
        d.Locataire?.NomPrenoms,
        d.DateDepense,
        d.Article,
        d.Quantite,
        d.PrixUnitaire,
        d.Montant,
        d.Observation,
        d.PieceJustificative,
        d.CreatedAt,
        d.UpdatedAt
    );
}
