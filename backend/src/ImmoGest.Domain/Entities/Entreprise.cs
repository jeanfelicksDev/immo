using ImmoGest.Domain.Common;

namespace ImmoGest.Domain.Entities;

/// <summary>
/// Entité représentant une entreprise/agence cliente SaaS dans ImmoGest.
/// Contient le profil d'identité et les métadonnées d'abonnement / période d'essai.
/// </summary>
public class Entreprise : BaseEntity
{
    public string Denomination { get; set; } = "ImmoGest Agence";
    public string? AdressePostale { get; set; } = "01 BP 1000 Abidjan 01";
    public string? AdressePhysique { get; set; } = "Boulevard de la République, Abidjan";
    public string? Telephone { get; set; } = "+225 07 00 00 00 00";
    public string? EmailCommercial { get; set; } = "contact@immogest.com";
    public string? RccmIfu { get; set; } = "CI-ABJ-2026-B-12345";
    public string? LogoUrl { get; set; }
    public string Devise { get; set; } = "FCFA";

    /// <summary>
    /// Statut SaaS du compte : "Essai", "Actif", "Bloque", "Expiere"
    /// </summary>
    public string StatutSaaS { get; set; } = "Essai";
    public DateTime DateDebutEssai { get; set; } = DateTime.UtcNow;
    public DateTime DateFinEssai { get; set; } = DateTime.UtcNow.AddDays(14);
    public bool EstBloque { get; set; } = false;
}
