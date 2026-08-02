using ImmoGest.Domain.Entities;
using ImmoGest.Domain.Enums;
using ImmoGest.Infrastructure.Data.Configurations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Npgsql;

namespace ImmoGest.Infrastructure.Data;

/// <summary>
/// Contexte principal de la base de données ImmoGest.
/// Gère l'audit automatique (CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
/// et le nommage snake_case PostgreSQL.
/// </summary>
public class AppDbContext : DbContext
{
    private Guid? _currentUserId;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Utilisateur>    Utilisateurs   { get; set; }
    public DbSet<Proprietaire>   Proprietaires  { get; set; }
    public DbSet<Maison>         Maisons        { get; set; }
    public DbSet<Locataire>      Locataires     { get; set; }
    public DbSet<Souscription>   Souscriptions  { get; set; }
    public DbSet<Reglement>      Reglements     { get; set; }
    public DbSet<Depense>        Depenses       { get; set; }
    public DbSet<Entreprise>     Entreprises    { get; set; }

    public void SetCurrentUser(Guid userId) => _currentUserId = userId;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Schéma PostgreSQL
        modelBuilder.HasDefaultSchema("immogest");

        // Application de toutes les configurations via IEntityTypeConfiguration<T>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Mapping des enums PostgreSQL
        modelBuilder.HasPostgresEnum<RoleUtilisateur>("immogest", "role_utilisateur");
        modelBuilder.HasPostgresEnum<TypeConstruction>("immogest", "type_construction");
        modelBuilder.HasPostgresEnum<TypeDepense>("immogest", "type_depense");
        modelBuilder.HasPostgresEnum<StatutSouscription>("immogest", "statut_souscription");
        modelBuilder.HasPostgresEnum<StatutPaiement>("immogest", "statut_paiement");

        // Convention de nommage snake_case automatique pour PostgreSQL (ex: NomComplet -> nom_complet)
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        Guid? activeUserId = _currentUserId.HasValue && _currentUserId.Value != Guid.Empty ? _currentUserId.Value : null;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is Domain.Common.BaseEntity baseEntity)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        baseEntity.CreatedAt = now;
                        baseEntity.UpdatedAt = now;
                        if (!baseEntity.CreatedBy.HasValue && activeUserId.HasValue)
                            baseEntity.CreatedBy = activeUserId;
                        if (!baseEntity.UpdatedBy.HasValue && activeUserId.HasValue)
                            baseEntity.UpdatedBy = activeUserId;
                        break;

                    case EntityState.Modified:
                        baseEntity.UpdatedAt = now;
                        if (activeUserId.HasValue)
                            baseEntity.UpdatedBy = activeUserId;

                        entry.Property(nameof(Domain.Common.BaseEntity.CreatedAt)).IsModified = false;
                        entry.Property(nameof(Domain.Common.BaseEntity.CreatedBy)).IsModified = false;
                        break;
                }
            }

            if (entry.Entity is Utilisateur utilisateur)
            {
                if (entry.State == EntityState.Added)
                    utilisateur.CreatedAt = utilisateur.UpdatedAt = now;
                else if (entry.State == EntityState.Modified)
                    utilisateur.UpdatedAt = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;
        return string.Concat(name.Select((x, i) => i > 0 && char.IsUpper(x) ? "_" + char.ToLower(x) : char.ToLower(x).ToString()));
    }
}
