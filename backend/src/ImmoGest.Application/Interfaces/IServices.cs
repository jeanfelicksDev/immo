using ImmoGest.Application.DTOs;
using ImmoGest.Domain.Entities;
using ImmoGest.Domain.Enums;

namespace ImmoGest.Application.Interfaces;

// ════════════════════════════════════════════════════════════════
// REPOSITORY GÉNÉRIQUE
// ════════════════════════════════════════════════════════════════
public interface IRepository<TEntity> where TEntity : class
{
    Task<TEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<TEntity>> GetAllAsync(CancellationToken ct = default);
    Task<TEntity> AddAsync(TEntity entity, CancellationToken ct = default);
    Task UpdateAsync(TEntity entity, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
}

// ════════════════════════════════════════════════════════════════
// SERVICES MÉTIER
// ════════════════════════════════════════════════════════════════

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task RevokeTokenAsync(string email, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface IDashboardService
{
    Task<DashboardKpisDto> GetKpisAsync(Guid? proprietaireId = null, Guid? locataireId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface IProprietaireService
{
    Task<PagedResult<ProprietaireDto>> GetAllAsync(PagedRequest request, CancellationToken ct = default);
    Task<ProprietaireDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProprietaireDto> CreateAsync(CreateProprietaireRequest request, Guid userId, CancellationToken ct = default);
    Task<ProprietaireDto> UpdateAsync(Guid id, UpdateProprietaireRequest request, Guid userId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface IMaisonService
{
    Task<PagedResult<MaisonDto>> GetAllAsync(PagedRequest request, bool? disponibleOnly = null, Guid? proprietaireId = null, CancellationToken ct = default);
    Task<MaisonDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MaisonDto?> GetByIdmAsync(string idm, CancellationToken ct = default);
    Task<MaisonDto> CreateAsync(CreateMaisonRequest request, Guid userId, CancellationToken ct = default);
    Task<MaisonDto> UpdateAsync(Guid id, UpdateMaisonRequest request, Guid userId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Génère un IDM métier unique basé sur les caractéristiques du bien.</summary>
    Task<string> GenerateIdmAsync(TypeConstruction type, int nbPieces, decimal loyer, string ville, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface ILocataireService
{
    Task<PagedResult<LocataireDto>> GetAllAsync(PagedRequest request, CancellationToken ct = default);
    Task<LocataireDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<LocataireDto> CreateAsync(CreateLocataireRequest request, Guid userId, CancellationToken ct = default);
    Task<LocataireDto> UpdateAsync(Guid id, UpdateLocataireRequest request, Guid userId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface ISouscriptionService
{
    Task<PagedResult<SouscriptionDto>> GetAllAsync(PagedRequest request, Guid? proprietaireId = null, Guid? locataireId = null, Guid? maisonId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default);
    Task<SouscriptionDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SouscriptionDto?> GetByIdsAsync(string ids, CancellationToken ct = default);
    Task<List<SouscriptionDto>> GetByLocataireAsync(Guid locataireId, CancellationToken ct = default);
    Task<List<SouscriptionDto>> GetByMaisonAsync(Guid maisonId, CancellationToken ct = default);
    Task<SouscriptionDto> CreateAsync(CreateSouscriptionRequest request, Guid userId, CancellationToken ct = default);
    Task<SouscriptionDto> UpdateAsync(Guid id, UpdateSouscriptionRequest request, Guid userId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Génère le PDF du contrat de location.</summary>
    Task<byte[]> GenerateContratPdfAsync(Guid id, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface IReglementService
{
    Task<PagedResult<ReglementDto>> GetAllAsync(PagedRequest request, Guid? proprietaireId = null, Guid? locataireId = null, Guid? maisonId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default);
    Task<ReglementDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<ReglementDto>> GetBySouscriptionAsync(Guid souscriptionId, CancellationToken ct = default);
    Task<List<ReglementDto>> GetByLocataireAsync(Guid locataireId, CancellationToken ct = default);
    Task<List<ReglementDto>> GetImapyesAsync(CancellationToken ct = default);
    Task<ReglementDto> CreateAsync(CreateReglementRequest request, Guid userId, CancellationToken ct = default);
    Task<List<ReglementDto>> CreateBatchAsync(CreateReglementsBatchRequest request, Guid userId, CancellationToken ct = default);
    Task<ReglementDto> UpdateAsync(Guid id, UpdateReglementRequest request, Guid userId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Génère le reçu PDF d'un règlement spécifique.</summary>
    Task<byte[]> GenerateRecuPdfAsync(Guid id, CancellationToken ct = default);

    /// <summary>Génère les reçus PDF de tous les règlements d'un mois (impression groupée).</summary>
    Task<byte[]> GenerateRecusGroupesPdfAsync(int annee, int mois, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

public interface IDepenseService
{
    Task<PagedResult<DepenseDto>> GetAllAsync(PagedRequest request, TypeDepense? type = null, Guid? proprietaireId = null, Guid? locataireId = null, Guid? maisonId = null, DateOnly? dateDebut = null, DateOnly? dateFin = null, CancellationToken ct = default);
    Task<DepenseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<DepenseDto>> GetByMaisonAsync(Guid maisonId, CancellationToken ct = default);
    Task<List<DepenseDto>> GetByLocataireAsync(Guid locataireId, CancellationToken ct = default);
    Task<DepenseDto> CreateAsync(CreateDepenseRequest request, Guid userId, CancellationToken ct = default);
    Task<DepenseDto> UpdateAsync(Guid id, UpdateDepenseRequest request, Guid userId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Upload d'une pièce justificative et association à une dépense.</summary>
    Task<string> UploadPieceJustificativeAsync(Guid depenseId, Stream fileStream, string fileName, CancellationToken ct = default);
}

// ─────────────────────────────────────────────────────────────

/// <summary>Service de génération de PDF (reçus, contrats).</summary>
public interface IPdfService
{
    Task<byte[]> GenerateContratAsync(SouscriptionDto souscription, CancellationToken ct = default);
    Task<byte[]> GenerateRecuAsync(ReglementDto reglement, CancellationToken ct = default);
    Task<byte[]> MergeAsync(IEnumerable<byte[]> pdfs, CancellationToken ct = default);
}

/// <summary>Service JWT pour la génération et validation des tokens.</summary>
public interface IJwtService
{
    string GenerateAccessToken(Guid userId, string email, string role);
    string GenerateRefreshToken();
    bool ValidateRefreshToken(string token);
    (Guid userId, string email, string role)? GetPrincipalFromExpiredToken(string token);
}
