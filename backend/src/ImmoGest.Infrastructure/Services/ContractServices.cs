using ImmoGest.Application.DTOs;
using ImmoGest.Application.Interfaces;
using ImmoGest.Domain.Entities;
using ImmoGest.Domain.Enums;
using ImmoGest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ImmoGest.Infrastructure.Services;

// ════════════════════════════════════════════════════════════════
// SERVICE : Souscriptions (Contrats de Location)
// ════════════════════════════════════════════════════════════════
public class SouscriptionService : ISouscriptionService
{
    private readonly AppDbContext _db;
    private readonly IPdfService _pdf;

    public SouscriptionService(AppDbContext db, IPdfService pdf)
    {
        _db = db;
        _pdf = pdf;
    }

    private async Task<Guid?> ResolveUserId(Guid userId, CancellationToken ct)
    {
        if (userId != Guid.Empty) return userId;
        var admin = await _db.Utilisateurs.Select(u => u.Id).FirstOrDefaultAsync(ct);
        return admin != Guid.Empty ? admin : null;
    }

    public async Task<PagedResult<SouscriptionDto>> GetAllAsync(PagedRequest req, Guid? proprietaireId = null, Guid? locataireId = null, Guid? maisonId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default)
    {
        var query = _db.Souscriptions
            .Include(s => s.Maison).ThenInclude(m => m.Proprietaire)
            .Include(s => s.Locataire)
            .Include(s => s.Reglements)
            .AsQueryable();

        if (proprietaireId.HasValue)
            query = query.Where(s => s.Maison.ProprietaireId == proprietaireId.Value);

        if (locataireId.HasValue)
            query = query.Where(s => s.LocataireId == locataireId.Value);

        if (maisonId.HasValue)
            query = query.Where(s => s.MaisonId == maisonId.Value);

        if (dateDebut.HasValue)
            query = query.Where(s => s.DateSouscription >= dateDebut.Value);

        if (dateFin.HasValue)
            query = query.Where(s => s.DateSouscription <= dateFin.Value);

        if (!string.IsNullOrWhiteSpace(req.Search))
            query = query.Where(s =>
                s.Ids.Contains(req.Search) ||
                s.Maison.Idm.Contains(req.Search) ||
                s.Locataire.NomPrenoms.Contains(req.Search));

        query = req.SortBy switch
        {
            "date"   => req.SortDesc ? query.OrderByDescending(s => s.DateSouscription) : query.OrderBy(s => s.DateSouscription),
            "statut" => req.SortDesc ? query.OrderByDescending(s => s.Statut) : query.OrderBy(s => s.Statut),
            _        => query.OrderByDescending(s => s.DateSouscription)
        };

        var total = await query.CountAsync(ct);
        var entities = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var items = entities.Select(MapToDto).ToList();

        return new PagedResult<SouscriptionDto>(items, total, req.Page, req.PageSize,
            (int)Math.Ceiling(total / (double)req.PageSize));
    }

    public async Task<SouscriptionDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var s = await LoadFull().FirstOrDefaultAsync(x => x.Id == id, ct);
        return s is null ? null : MapToDto(s);
    }

    public async Task<SouscriptionDto?> GetByIdsAsync(string ids, CancellationToken ct = default)
    {
        var s = await LoadFull().FirstOrDefaultAsync(x => x.Ids == ids, ct);
        return s is null ? null : MapToDto(s);
    }

    public async Task<List<SouscriptionDto>> GetByLocataireAsync(Guid locataireId, CancellationToken ct = default)
    {
        var entities = await LoadFull().Where(s => s.LocataireId == locataireId).ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<List<SouscriptionDto>> GetByMaisonAsync(Guid maisonId, CancellationToken ct = default)
    {
        var entities = await LoadFull().Where(s => s.MaisonId == maisonId).ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<SouscriptionDto> CreateAsync(CreateSouscriptionRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var maison = await _db.Maisons.FindAsync(new object[] { req.MaisonId }, ct)
            ?? throw new KeyNotFoundException($"Maison {req.MaisonId} introuvable.");

        if (!maison.EstDisponible)
            throw new InvalidOperationException("Ce bien immobilier est déjà occupé.");

        var ids = req.Ids ?? await GenerateIdsAsync(ct);

        if (await _db.Souscriptions.AnyAsync(s => s.Ids == ids, ct))
            throw new InvalidOperationException($"L'identifiant de contrat '{ids}' est déjà utilisé.");

        var entity = new Souscription
        {
            Ids               = ids,
            MaisonId          = req.MaisonId,
            LocataireId       = req.LocataireId,
            DateSouscription  = req.DateSouscription,
            DateFin           = req.DateFin,
            MontantLoyer      = req.MontantLoyer,
            MontantCaution    = req.MontantCaution,
            MontantAvance     = req.MontantAvance,
            NbMoisContrat     = req.NbMoisContrat,
            Conditions        = string.IsNullOrWhiteSpace(req.Conditions) ? null : req.Conditions.Trim(),
            Statut            = StatutSouscription.Active,
            CreatedBy         = resolvedUserId,
            UpdatedBy         = resolvedUserId
        };

        maison.EstDisponible = false;

        _db.Souscriptions.Add(entity);
        await _db.SaveChangesAsync(ct);

        return MapToDto(await LoadFull().FirstAsync(s => s.Id == entity.Id, ct));
    }

    public async Task<SouscriptionDto> UpdateAsync(Guid id, UpdateSouscriptionRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = await LoadFull().FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException($"Souscription {id} introuvable.");

        var wasActive = entity.Statut == StatutSouscription.Active;
        var isNowClosed = req.Statut is StatutSouscription.Expiree or StatutSouscription.Resiliee;

        entity.DateFin        = req.DateFin;
        entity.MontantLoyer   = req.MontantLoyer;
        entity.MontantCaution = req.MontantCaution;
        entity.MontantAvance  = req.MontantAvance;
        entity.NbMoisContrat  = req.NbMoisContrat;
        entity.Statut         = req.Statut;
        entity.Conditions     = string.IsNullOrWhiteSpace(req.Conditions) ? null : req.Conditions.Trim();
        entity.UpdatedBy      = resolvedUserId;

        if (wasActive && isNowClosed)
            entity.Maison.EstDisponible = true;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Souscriptions
            .Include(s => s.Maison)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException($"Souscription {id} introuvable.");

        // Nettoyage des règlements rattachés à ce contrat
        var reglements = await _db.Reglements.Where(r => r.SouscriptionId == id).ToListAsync(ct);
        if (reglements.Any()) _db.Reglements.RemoveRange(reglements);

        // Si le contrat supprimé était actif, libérer la maison associée
        if (entity.Maison != null && entity.Statut == StatutSouscription.Active)
        {
            entity.Maison.EstDisponible = true;
        }

        _db.Souscriptions.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<byte[]> GenerateContratPdfAsync(Guid id, CancellationToken ct = default)
    {
        var souscription = await GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"Souscription {id} introuvable.");

        return await _pdf.GenerateContratAsync(souscription, ct);
    }

    private IQueryable<Souscription> LoadFull() => _db.Souscriptions
        .Include(s => s.Maison).ThenInclude(m => m.Proprietaire)
        .Include(s => s.Locataire)
        .Include(s => s.Reglements);

    private async Task<string> GenerateIdsAsync(CancellationToken ct)
    {
        var seq = await _db.Souscriptions.CountAsync(ct) + 1;
        return $"CTR-{DateTime.UtcNow.Year}-{seq:D4}";
    }

    private static SouscriptionDto MapToDto(Souscription s)
    {
        decimal totalPaye = 0m;
        decimal totalImpaye = 0m;
        if (s.Reglements != null)
        {
            foreach (var r in s.Reglements)
            {
                totalPaye += r.MontantPaye;
                totalImpaye += (r.MontantAPayer - r.MontantPaye);
            }
        }

        return new SouscriptionDto(
            s.Id, s.Ids,
            s.MaisonId,    s.Maison?.Idm ?? "", s.Maison?.Ville ?? "", s.Maison?.TypeConstruction.ToString() ?? "",
            s.LocataireId, s.Locataire?.NomPrenoms ?? "", s.Locataire?.Contact,
            s.DateSouscription, s.DateFin,
            s.MontantLoyer, s.MontantCaution, s.MontantAvance, s.NbMoisContrat,
            s.Statut.ToString(), s.Conditions,
            totalPaye,
            totalImpaye,
            s.CreatedAt, s.UpdatedAt
        );
    }
}

// ════════════════════════════════════════════════════════════════
// SERVICE : Règlements (Paiements)
// ════════════════════════════════════════════════════════════════
public class ReglementService : IReglementService
{
    private readonly AppDbContext _db;
    private readonly IPdfService _pdf;

    public ReglementService(AppDbContext db, IPdfService pdf)
    {
        _db = db;
        _pdf = pdf;
    }

    private async Task<Guid?> ResolveUserId(Guid userId, CancellationToken ct)
    {
        if (userId != Guid.Empty) return userId;
        var admin = await _db.Utilisateurs.Select(u => u.Id).FirstOrDefaultAsync(ct);
        return admin != Guid.Empty ? admin : null;
    }

    public async Task<PagedResult<ReglementDto>> GetAllAsync(PagedRequest req, Guid? proprietaireId = null, Guid? locataireId = null, Guid? maisonId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default)
    {
        var query = _db.Reglements
            .Include(r => r.Maison)
            .Include(r => r.Locataire)
            .Include(r => r.Souscription)
            .AsQueryable();

        if (proprietaireId.HasValue)
            query = query.Where(r => r.Maison.ProprietaireId == proprietaireId.Value);

        if (locataireId.HasValue)
            query = query.Where(r => r.LocataireId == locataireId.Value);

        if (maisonId.HasValue)
            query = query.Where(r => r.MaisonId == maisonId.Value);

        if (dateDebut.HasValue)
            query = query.Where(r => r.DatePaiement >= dateDebut.Value);

        if (dateFin.HasValue)
            query = query.Where(r => r.DatePaiement <= dateFin.Value);

        if (!string.IsNullOrWhiteSpace(req.Search))
            query = query.Where(r =>
                r.Idr.Contains(req.Search) ||
                r.Maison.Idm.Contains(req.Search) ||
                r.Locataire.NomPrenoms.Contains(req.Search));

        query = req.SortDesc
            ? query.OrderByDescending(r => r.DatePaiement)
            : query.OrderBy(r => r.DatePaiement);

        var total = await query.CountAsync(ct);
        var entities = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var items = entities.Select(MapToDto).ToList();

        return new PagedResult<ReglementDto>(items, total, req.Page, req.PageSize,
            (int)Math.Ceiling(total / (double)req.PageSize));
    }

    public async Task<ReglementDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var r = await LoadFull().FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? null : MapToDto(r);
    }

    public async Task<List<ReglementDto>> GetBySouscriptionAsync(Guid souscriptionId, CancellationToken ct = default)
    {
        var entities = await LoadFull().Where(r => r.SouscriptionId == souscriptionId)
            .OrderBy(r => r.MoisConcerne)
            .ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<List<ReglementDto>> GetByLocataireAsync(Guid locataireId, CancellationToken ct = default)
    {
        var entities = await LoadFull().Where(r => r.LocataireId == locataireId)
            .OrderByDescending(r => r.MoisConcerne)
            .ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<List<ReglementDto>> GetImapyesAsync(CancellationToken ct = default)
    {
        var entities = await LoadFull().Where(r => r.Statut == StatutPaiement.EnAttente || r.Statut == StatutPaiement.Partiel || r.Statut == StatutPaiement.EnRetard)
            .OrderBy(r => r.MoisConcerne)
            .ToListAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<ReglementDto> CreateAsync(CreateReglementRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var souscription = await _db.Souscriptions.FindAsync(new object[] { req.SouscriptionId }, ct)
            ?? throw new KeyNotFoundException($"Souscription {req.SouscriptionId} introuvable.");

        var idr = req.Idr ?? await GenerateIdrAsync(ct);
        var statut = req.MontantPaye >= req.MontantAPayer ? StatutPaiement.Paye
                   : req.MontantPaye > 0 ? StatutPaiement.Partiel
                   : StatutPaiement.EnAttente;

        var entity = new Reglement
        {
            Idr            = idr,
            SouscriptionId = req.SouscriptionId,
            MaisonId       = souscription.MaisonId,
            LocataireId    = souscription.LocataireId,
            DatePaiement   = req.DatePaiement,
            MoisConcerne   = req.MoisConcerne,
            MontantAPayer  = req.MontantAPayer,
            MontantPaye    = req.MontantPaye,
            Statut         = statut,
            Notes          = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedBy      = resolvedUserId,
            UpdatedBy      = resolvedUserId
        };

        _db.Reglements.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapToDto(await LoadFull().FirstAsync(r => r.Id == entity.Id, ct));
    }

    public async Task<List<ReglementDto>> CreateBatchAsync(CreateReglementsBatchRequest req, Guid userId, CancellationToken ct = default)
    {
        var results = new List<ReglementDto>();
        foreach (var item in req.Reglements)
            results.Add(await CreateAsync(item, userId, ct));
        return results;
    }

    public async Task<ReglementDto> UpdateAsync(Guid id, UpdateReglementRequest req, Guid userId, CancellationToken ct = default)
    {
        var resolvedUserId = await ResolveUserId(userId, ct);
        var entity = await LoadFull().FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException($"Règlement {id} introuvable.");

        entity.DatePaiement = req.DatePaiement;
        entity.MontantPaye  = req.MontantPaye;
        entity.Statut       = req.MontantPaye >= entity.MontantAPayer ? StatutPaiement.Paye
                            : req.MontantPaye > 0 ? StatutPaiement.Partiel
                            : StatutPaiement.EnAttente;
        entity.Notes        = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        entity.UpdatedBy    = resolvedUserId;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Reglements.FindAsync(new object[] { id }, ct)
            ?? throw new KeyNotFoundException($"Règlement {id} introuvable.");

        _db.Reglements.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<byte[]> GenerateRecuPdfAsync(Guid id, CancellationToken ct = default)
    {
        var reglement = await GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"Règlement {id} introuvable.");

        return await _pdf.GenerateRecuAsync(reglement, ct);
    }

    public async Task<byte[]> GenerateRecusGroupesPdfAsync(int annee, int mois, CancellationToken ct = default)
    {
        var reglements = await LoadFull()
            .Where(r => r.MoisConcerne.Year == annee && r.MoisConcerne.Month == mois)
            .ToListAsync(ct);

        var dtos = reglements.Select(MapToDto).ToList();

        var pdfs = new List<byte[]>();
        foreach (var r in dtos)
            pdfs.Add(await _pdf.GenerateRecuAsync(r, ct));

        return await _pdf.MergeAsync(pdfs, ct);
    }

    private IQueryable<Reglement> LoadFull() => _db.Reglements
        .Include(r => r.Maison)
        .Include(r => r.Locataire)
        .Include(r => r.Souscription);

    private async Task<string> GenerateIdrAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var seq = await _db.Reglements.CountAsync(ct) + 1;
        return $"REG-{now.Year}{now.Month:D2}-{seq:D5}";
    }

    private static ReglementDto MapToDto(Reglement r) => new(
        r.Id, r.Idr,
        r.SouscriptionId, r.Souscription?.Ids ?? "",
        r.MaisonId,    r.Maison?.Idm ?? "",    r.Maison?.Ville ?? "",
        r.LocataireId, r.Locataire?.NomPrenoms ?? "", r.Locataire?.Contact,
        r.DatePaiement, r.MoisConcerne,
        r.MontantAPayer, r.MontantPaye, r.MontantAPayer - r.MontantPaye,
        r.Statut.ToString(), r.Notes,
        r.CreatedAt, r.UpdatedAt
    );
}
