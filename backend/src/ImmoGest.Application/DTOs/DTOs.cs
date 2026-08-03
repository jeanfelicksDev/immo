using ImmoGest.Domain.Enums;

namespace ImmoGest.Application.DTOs;

// ════════════════════════════════════════════════════════════════
// AUTH DTOs
// ════════════════════════════════════════════════════════════════
public record LoginRequest(string Email, string MotDePasse);

public record RegisterRequest(
    string NomComplet,
    string Email,
    string MotDePasse,
    RoleUtilisateur Role = RoleUtilisateur.Agent
);

public record AuthResponse(
    Guid Id,
    string NomComplet,
    string Email,
    RoleUtilisateur Role,
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);

public record RefreshTokenRequest(string RefreshToken);

public record UtilisateurDto(
    Guid Id,
    string NomComplet,
    string Email,
    RoleUtilisateur Role,
    bool EstActif,
    DateTime CreatedAt
);

public record ToggleUserStatusRequest(bool EstActif);

// ════════════════════════════════════════════════════════════════
// DASHBOARD DTOs
// ════════════════════════════════════════════════════════════════
public record DashboardKpisDto(
    int TotalProprietaires,
    int TotalLocataires,
    int TotalMaisons,
    int TotalSouscriptionsActives,
    decimal TotalCaution,
    decimal TotalAvance,
    decimal TotalLoyerMensuel,
    decimal TotalResteRecouvrir
);

// ════════════════════════════════════════════════════════════════
// PROPRIÉTAIRE DTOs
// ════════════════════════════════════════════════════════════════
public record ProprietaireDto(
    Guid Id,
    string NomPrenoms,
    string? Contact,
    string? Email,
    string? Adresse,
    string? Notes,
    bool EstActif,
    int NbMaisons,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateProprietaireRequest(
    string NomPrenoms,
    string? Contact,
    string? Email,
    string? Adresse,
    string? Notes
);

public record UpdateProprietaireRequest(
    string NomPrenoms,
    string? Contact,
    string? Email,
    string? Adresse,
    string? Notes,
    bool EstActif
);

// ════════════════════════════════════════════════════════════════
// MAISON DTOs
// ════════════════════════════════════════════════════════════════
public record MaisonDto(
    Guid Id,
    string Idm,
    Guid ProprietaireId,
    string NomProprietaire,
    string TypeConstruction,
    int NbPieces,
    decimal CoutLoyer,
    string Ville,
    string? Quartier,
    string? AdresseComplete,
    string? Description,
    bool EstDisponible,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateMaisonRequest(
    string? Idm,                            // NULL = génération automatique
    Guid ProprietaireId,
    TypeConstruction TypeConstruction,
    int NbPieces,
    decimal CoutLoyer,
    string Ville,
    string? Quartier,
    string? AdresseComplete,
    string? Description
);

public record UpdateMaisonRequest(
    Guid ProprietaireId,
    TypeConstruction TypeConstruction,
    int NbPieces,
    decimal CoutLoyer,
    string Ville,
    string? Quartier,
    string? AdresseComplete,
    string? Description,
    bool EstDisponible
);

// ════════════════════════════════════════════════════════════════
// LOCATAIRE DTOs
// ════════════════════════════════════════════════════════════════
public record LocataireDto(
    Guid Id,
    string NomPrenoms,
    string? Contact,
    string? Email,
    string? Adresse,
    string? PieceIdentite,
    string? Profession,
    string? Notes,
    bool EstActif,
    int NbContrats,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateLocataireRequest(
    string NomPrenoms,
    string? Contact,
    string? Email,
    string? Adresse,
    string? PieceIdentite,
    string? Profession,
    string? Notes
);

public record UpdateLocataireRequest(
    string NomPrenoms,
    string? Contact,
    string? Email,
    string? Adresse,
    string? PieceIdentite,
    string? Profession,
    string? Notes,
    bool EstActif
);

// ════════════════════════════════════════════════════════════════
// SOUSCRIPTION DTOs
// ════════════════════════════════════════════════════════════════
public record SouscriptionDto(
    Guid Id,
    string Ids,
    Guid MaisonId,
    string IdmMaison,
    string VilleMaison,
    string TypeConstructionMaison,
    Guid LocataireId,
    string NomLocataire,
    string? ContactLocataire,
    DateOnly DateSouscription,
    DateOnly? DateFin,
    decimal MontantLoyer,
    decimal MontantCaution,
    decimal MontantAvance,
    int? NbMoisContrat,
    string Statut,
    string? Conditions,
    decimal TotalPaye,
    decimal TotalImpaye,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateSouscriptionRequest(
    string? Ids,                            // NULL = génération automatique
    Guid MaisonId,
    Guid LocataireId,
    DateOnly DateSouscription,
    DateOnly? DateFin,
    decimal MontantLoyer,
    decimal MontantCaution,
    decimal MontantAvance,
    int? NbMoisContrat,
    string? Conditions
);

public record UpdateSouscriptionRequest(
    DateOnly? DateFin,
    decimal MontantLoyer,
    decimal MontantCaution,
    decimal MontantAvance,
    int? NbMoisContrat,
    StatutSouscription Statut,
    string? Conditions
);

// ════════════════════════════════════════════════════════════════
// RÈGLEMENT DTOs
// ════════════════════════════════════════════════════════════════
public record ReglementDto(
    Guid Id,
    string Idr,
    Guid SouscriptionId,
    string IdsSouscription,
    Guid MaisonId,
    string IdmMaison,
    string VilleMaison,
    Guid LocataireId,
    string NomLocataire,
    string? ContactLocataire,
    DateOnly DatePaiement,
    DateOnly MoisConcerne,
    decimal MontantAPayer,
    decimal MontantPaye,
    decimal ResteAPayer,
    string Statut,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateReglementRequest(
    string? Idr,                            // NULL = génération automatique
    Guid SouscriptionId,
    DateOnly DatePaiement,
    DateOnly MoisConcerne,
    decimal MontantAPayer,
    decimal MontantPaye,
    string? Notes
);

/// <summary>Saisie multiple de règlements en une seule opération.</summary>
public record CreateReglementsBatchRequest(
    List<CreateReglementRequest> Reglements
);

public record UpdateReglementRequest(
    DateOnly DatePaiement,
    decimal MontantPaye,
    string? Notes
);

// ════════════════════════════════════════════════════════════════
// DÉPENSE DTOs
// ════════════════════════════════════════════════════════════════
public record DepenseDto(
    Guid Id,
    string TypeDepense,
    Guid? MaisonId,
    string? IdmMaison,
    string? VilleMaison,
    Guid? LocataireId,
    string? NomLocataire,
    DateOnly DateDepense,
    string Article,
    decimal Quantite,
    decimal PrixUnitaire,
    decimal Montant,
    string? Observation,
    string? PieceJustificative,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateDepenseRequest(
    TypeDepense TypeDepense,
    Guid? MaisonId,
    Guid? LocataireId,
    DateOnly DateDepense,
    string Article,
    decimal Quantite,
    decimal PrixUnitaire,
    string? Observation,
    string? PieceJustificativeFileName    // Le fichier est uploadé séparément
);

public record UpdateDepenseRequest(
    TypeDepense TypeDepense,
    Guid? MaisonId,
    Guid? LocataireId,
    DateOnly DateDepense,
    string Article,
    decimal Quantite,
    decimal PrixUnitaire,
    string? Observation
);

// ════════════════════════════════════════════════════════════════
// PAGINATION & FILTRES
// ════════════════════════════════════════════════════════════════
public record PagedRequest(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    string? SortBy = null,
    bool SortDesc = false
);

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
)
{
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
