using NpgsqlTypes;

namespace ImmoGest.Domain.Enums;

/// <summary>Rôles applicatifs des utilisateurs.</summary>
public enum RoleUtilisateur
{
    [PgName("Administrateur")]
    Administrateur,

    [PgName("Gestionnaire")]
    Gestionnaire,

    [PgName("Agent")]
    Agent
}

/// <summary>Type de construction / nature du bien immobilier.</summary>
public enum TypeConstruction
{
    [PgName("Maison basse")]
    MaisonBasse,

    [PgName("Appartement")]
    Appartement,

    [PgName("Villa")]
    Villa,

    [PgName("Studio")]
    Studio,

    [PgName("Duplex")]
    Duplex,

    [PgName("Bureau")]
    Bureau,

    [PgName("Commerce")]
    Commerce,

    [PgName("Entrepôt")]
    Entrepot
}

/// <summary>Catégorie de dépense pour le module Gestion des Dépenses.</summary>
public enum TypeDepense
{
    /// <summary>Frais généraux de l'agence (non liés à un bien ou locataire).</summary>
    [PgName("Dépenses globales")]
    DepensesGlobales,

    /// <summary>Charges liées à un bien immobilier spécifique (réparations, entretien).</summary>
    [PgName("Dépenses d'une maison")]
    DepensesMaison,

    /// <summary>Frais refacturables ou imputables à un locataire.</summary>
    [PgName("Imputation Locataire")]
    ImputationLocataire
}

/// <summary>Statut d'un contrat de location (souscription).</summary>
public enum StatutSouscription
{
    [PgName("Active")]
    Active,

    [PgName("Expirée")]
    Expiree,

    [PgName("Résiliée")]
    Resiliee,

    [PgName("En attente")]
    EnAttente
}

/// <summary>Statut du paiement d'un règlement.</summary>
public enum StatutPaiement
{
    [PgName("En attente")]
    EnAttente,

    [PgName("Partiel")]
    Partiel,

    [PgName("Payé")]
    Paye,

    [PgName("En retard")]
    EnRetard
}
