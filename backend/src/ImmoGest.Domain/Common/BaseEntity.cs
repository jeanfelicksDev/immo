namespace ImmoGest.Domain.Common;

/// <summary>
/// Classe de base pour toutes les entités du domaine.
/// Contient les champs d'audit (horodatage, traçabilité des créations/modifications).
/// </summary>
public abstract class BaseEntity
{
    /// <summary>Identifiant unique de l'entité (UUID v4).</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Date et heure de création (UTC).</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Date et heure de la dernière modification (UTC).</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Identifiant de l'utilisateur ayant créé l'entité.</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>Identifiant de l'utilisateur ayant modifié l'entité en dernier.</summary>
    public Guid? UpdatedBy { get; set; }
}
