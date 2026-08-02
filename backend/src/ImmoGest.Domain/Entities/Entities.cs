using ImmoGest.Domain.Common;
using ImmoGest.Domain.Enums;

namespace ImmoGest.Domain.Entities;

/// <summary>
/// Compte utilisateur de la plateforme ImmoGest.
/// Hérite des champs d'audit. Pas de champ d'héritage de BaseEntity
/// pour éviter la récursion (CreatedBy référence lui-même).
/// </summary>
public class Utilisateur
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Nom complet de l'utilisateur (Nom + Prénoms).</summary>
    public required string NomComplet { get; set; }

    /// <summary>Adresse email, utilisée comme identifiant de connexion.</summary>
    public required string Email { get; set; }

    /// <summary>Mot de passe hashé (bcrypt). Ne jamais stocker en clair.</summary>
    public required string MotDePasse { get; set; }

    public RoleUtilisateur Role { get; set; } = RoleUtilisateur.Agent;

    public bool EstActif { get; set; } = true;

    /// <summary>Token de rafraîchissement JWT.</summary>
    public string? RefreshToken { get; set; }

    /// <summary>Date d'expiration du refresh token.</summary>
    public DateTime? TokenExpiry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }

    // Navigation
    public ICollection<Proprietaire> ProprietairesCreated { get; set; } = [];
    public ICollection<Maison> MaisonsCreated { get; set; } = [];
    public ICollection<Locataire> LocatairesCreated { get; set; } = [];
    public ICollection<Souscription> SouscriptionsCreated { get; set; } = [];
    public ICollection<Reglement> ReglementsCreated { get; set; } = [];
    public ICollection<Depense> DepensesCreated { get; set; } = [];
}

// ─────────────────────────────────────────────────────────────

/// <summary>Propriétaire d'un ou plusieurs biens immobiliers.</summary>
public class Proprietaire : BaseEntity
{
    /// <summary>Nom et prénoms complets du propriétaire.</summary>
    public required string NomPrenoms { get; set; }

    public string? Contact { get; set; }
    public string? Email { get; set; }
    public string? Adresse { get; set; }
    public string? Notes { get; set; }
    public bool EstActif { get; set; } = true;

    // Navigation
    public ICollection<Maison> Maisons { get; set; } = [];

    public Utilisateur? CreatedByUser { get; set; }
    public Utilisateur? UpdatedByUser { get; set; }
}

// ─────────────────────────────────────────────────────────────

/// <summary>Bien immobilier géré par l'agence.</summary>
public class Maison : BaseEntity
{
    /// <summary>
    /// Identifiant métier unique du bien.
    /// Format : {TypePrefix}_P{NbPieces}_C{Loyer}_{Ville3L}_{Seq3d}
    /// Exemple : AP_P3_C80000_ABJ_001
    /// </summary>
    public required string Idm { get; set; }

    public Guid ProprietaireId { get; set; }
    public Proprietaire Proprietaire { get; set; } = null!;

    public TypeConstruction TypeConstruction { get; set; } = TypeConstruction.Appartement;

    /// <summary>Nombre de pièces (≥ 1).</summary>
    public int NbPieces { get; set; } = 1;

    /// <summary>Montant mensuel du loyer en devise locale (FCFA).</summary>
    public decimal CoutLoyer { get; set; }

    public required string Ville { get; set; }
    public string? Quartier { get; set; }
    public string? AdresseComplete { get; set; }
    public string? Description { get; set; }
    public bool EstDisponible { get; set; } = true;

    // Navigation
    public ICollection<Souscription> Souscriptions { get; set; } = [];
    public ICollection<Reglement> Reglements { get; set; } = [];
    public ICollection<Depense> Depenses { get; set; } = [];

    public Utilisateur? CreatedByUser { get; set; }
    public Utilisateur? UpdatedByUser { get; set; }
}

// ─────────────────────────────────────────────────────────────

/// <summary>Locataire d'un ou plusieurs biens.</summary>
public class Locataire : BaseEntity
{
    public required string NomPrenoms { get; set; }
    public string? Contact { get; set; }
    public string? Email { get; set; }
    public string? Adresse { get; set; }

    /// <summary>Numéro de pièce d'identité (CNI, Passeport, etc.).</summary>
    public string? PieceIdentite { get; set; }

    public string? Profession { get; set; }
    public string? Notes { get; set; }
    public bool EstActif { get; set; } = true;

    // Navigation
    public ICollection<Souscription> Souscriptions { get; set; } = [];
    public ICollection<Reglement> Reglements { get; set; } = [];
    public ICollection<Depense> Depenses { get; set; } = [];

    public Utilisateur? CreatedByUser { get; set; }
    public Utilisateur? UpdatedByUser { get; set; }
}

// ─────────────────────────────────────────────────────────────

/// <summary>
/// Contrat de location liant un locataire à un bien immobilier.
/// Contient les conditions financières et la durée du bail.
/// </summary>
public class Souscription : BaseEntity
{
    /// <summary>
    /// Identifiant métier du contrat.
    /// Format : CTR-{Année}-{Sequence4d} — ex: CTR-2024-0001
    /// </summary>
    public required string Ids { get; set; }

    public Guid MaisonId { get; set; }
    public Maison Maison { get; set; } = null!;

    public Guid LocataireId { get; set; }
    public Locataire Locataire { get; set; } = null!;

    public DateOnly DateSouscription { get; set; } = DateOnly.FromDateTime(DateTime.Today);

    /// <summary>Date de fin du contrat. NULL = durée indéterminée.</summary>
    public DateOnly? DateFin { get; set; }

    /// <summary>Montant mensuel du loyer contractualisé.</summary>
    public decimal MontantLoyer { get; set; }

    /// <summary>Dépôt de garantie (caution).</summary>
    public decimal MontantCaution { get; set; } = 0;

    /// <summary>Avance sur loyer versée à la signature.</summary>
    public decimal MontantAvance { get; set; } = 0;

    /// <summary>Durée du contrat en mois. NULL = open-ended.</summary>
    public int? NbMoisContrat { get; set; }

    public StatutSouscription Statut { get; set; } = StatutSouscription.Active;

    /// <summary>Clauses particulières et conditions spéciales du bail.</summary>
    public string? Conditions { get; set; }

    // Navigation
    public ICollection<Reglement> Reglements { get; set; } = [];

    public Utilisateur? CreatedByUser { get; set; }
    public Utilisateur? UpdatedByUser { get; set; }
}

// ─────────────────────────────────────────────────────────────

/// <summary>
/// Enregistrement d'un paiement de loyer pour une période donnée.
/// Supporte les paiements partiels et le suivi des impayés.
/// </summary>
public class Reglement : BaseEntity
{
    /// <summary>
    /// Identifiant métier du règlement.
    /// Format : REG-{AAAAMM}-{Sequence5d}
    /// </summary>
    public required string Idr { get; set; }

    public Guid SouscriptionId { get; set; }
    public Souscription Souscription { get; set; } = null!;

    public Guid MaisonId { get; set; }
    public Maison Maison { get; set; } = null!;

    public Guid LocataireId { get; set; }
    public Locataire Locataire { get; set; } = null!;

    public DateOnly DatePaiement { get; set; } = DateOnly.FromDateTime(DateTime.Today);

    /// <summary>Premier jour du mois pour lequel ce loyer est réglé.</summary>
    public DateOnly MoisConcerne { get; set; }

    /// <summary>Montant dû selon le contrat.</summary>
    public decimal MontantAPayer { get; set; }

    /// <summary>Montant effectivement encaissé.</summary>
    public decimal MontantPaye { get; set; } = 0;

    /// <summary>Reste à payer = MontantAPayer - MontantPaye.</summary>
    public decimal ResteAPayer => MontantAPayer - MontantPaye;

    public StatutPaiement Statut { get; set; } = StatutPaiement.EnAttente;

    public string? Notes { get; set; }

    public Utilisateur? CreatedByUser { get; set; }
    public Utilisateur? UpdatedByUser { get; set; }
}

// ─────────────────────────────────────────────────────────────

/// <summary>
/// Dépense enregistrée : globale (agence), liée à un bien, ou imputée à un locataire.
/// Le montant total est calculé automatiquement : Quantite × PrixUnitaire.
/// </summary>
public class Depense : BaseEntity
{
    public TypeDepense TypeDepense { get; set; }

    /// <summary>Bien immobilier concerné (si TypeDepense = DepensesMaison).</summary>
    public Guid? MaisonId { get; set; }
    public Maison? Maison { get; set; }

    /// <summary>Locataire concerné (si TypeDepense = ImputationLocataire).</summary>
    public Guid? LocataireId { get; set; }
    public Locataire? Locataire { get; set; }

    public DateOnly DateDepense { get; set; } = DateOnly.FromDateTime(DateTime.Today);

    /// <summary>Libellé / intitulé de la charge (ex: "Réparation climatiseur").</summary>
    public required string Article { get; set; }

    /// <summary>Quantité de l'article (peut être en litres, heures, unités, etc.).</summary>
    public decimal Quantite { get; set; } = 1;

    /// <summary>Prix unitaire de l'article.</summary>
    public decimal PrixUnitaire { get; set; }

    /// <summary>Montant total calculé : Quantite × PrixUnitaire.</summary>
    public decimal Montant => Quantite * PrixUnitaire;

    public string? Observation { get; set; }

    /// <summary>Référence ou chemin du fichier justificatif uploadé.</summary>
    public string? PieceJustificative { get; set; }

    public Utilisateur? CreatedByUser { get; set; }
    public Utilisateur? UpdatedByUser { get; set; }
}
