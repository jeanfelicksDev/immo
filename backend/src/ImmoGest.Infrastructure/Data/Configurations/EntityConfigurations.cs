using ImmoGest.Domain.Entities;
using ImmoGest.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ImmoGest.Infrastructure.Data.Configurations;

// ════════════════════════════════════════════════════════════════
// Configuration : Utilisateur
// ════════════════════════════════════════════════════════════════
public class UtilisateurConfiguration : IEntityTypeConfiguration<Utilisateur>
{
    public void Configure(EntityTypeBuilder<Utilisateur> builder)
    {
        builder.ToTable("utilisateurs");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.NomComplet).HasMaxLength(200).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(255).IsRequired();
        builder.Property(u => u.MotDePasse).IsRequired();
        builder.Property(u => u.Role).IsRequired();
        builder.Property(u => u.RefreshToken).HasMaxLength(500);
        builder.Property(u => u.CreatedAt).HasColumnType("timestamptz");
        builder.Property(u => u.UpdatedAt).HasColumnType("timestamptz");
        builder.Property(u => u.TokenExpiry).HasColumnType("timestamptz");

        builder.HasIndex(u => u.Email).IsUnique();
    }
}

// ════════════════════════════════════════════════════════════════
// Configuration : Proprietaire
// ════════════════════════════════════════════════════════════════
public class ProprietaireConfiguration : IEntityTypeConfiguration<Proprietaire>
{
    public void Configure(EntityTypeBuilder<Proprietaire> builder)
    {
        builder.ToTable("proprietaires");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.NomPrenoms).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Contact).HasMaxLength(50);
        builder.Property(p => p.Email).HasMaxLength(255);
        builder.Property(p => p.Adresse).HasColumnType("text");
        builder.Property(p => p.Notes).HasColumnType("text");
        builder.Property(p => p.CreatedAt).HasColumnType("timestamptz");
        builder.Property(p => p.UpdatedAt).HasColumnType("timestamptz");

        // Relations d'audit
        builder.HasOne(p => p.CreatedByUser)
               .WithMany(u => u.ProprietairesCreated)
               .HasForeignKey(p => p.CreatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.UpdatedByUser)
               .WithMany()
               .HasForeignKey(p => p.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        // Navigation inverse
        builder.HasMany(p => p.Maisons)
               .WithOne(m => m.Proprietaire)
               .HasForeignKey(m => m.ProprietaireId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}

// ════════════════════════════════════════════════════════════════
// Configuration : Maison
// ════════════════════════════════════════════════════════════════
public class MaisonConfiguration : IEntityTypeConfiguration<Maison>
{
    public void Configure(EntityTypeBuilder<Maison> builder)
    {
        builder.ToTable("maisons");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Idm).HasMaxLength(100).IsRequired();
        builder.Property(m => m.TypeConstruction).IsRequired();
        builder.Property(m => m.NbPieces).IsRequired();
        builder.Property(m => m.CoutLoyer).HasColumnType("numeric(12,2)").IsRequired();
        builder.Property(m => m.Ville).HasMaxLength(100).IsRequired();
        builder.Property(m => m.Quartier).HasMaxLength(100);
        builder.Property(m => m.AdresseComplete).HasColumnType("text");
        builder.Property(m => m.Description).HasColumnType("text");
        builder.Property(m => m.CreatedAt).HasColumnType("timestamptz");
        builder.Property(m => m.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(m => m.Idm).IsUnique();
        builder.HasIndex(m => m.Ville);
        builder.HasIndex(m => m.EstDisponible);

        builder.HasOne(m => m.CreatedByUser)
               .WithMany(u => u.MaisonsCreated)
               .HasForeignKey(m => m.CreatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(m => m.UpdatedByUser)
               .WithMany()
               .HasForeignKey(m => m.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull);
    }
}

// ════════════════════════════════════════════════════════════════
// Configuration : Locataire
// ════════════════════════════════════════════════════════════════
public class LocataireConfiguration : IEntityTypeConfiguration<Locataire>
{
    public void Configure(EntityTypeBuilder<Locataire> builder)
    {
        builder.ToTable("locataires");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.NomPrenoms).HasMaxLength(200).IsRequired();
        builder.Property(l => l.Contact).HasMaxLength(50);
        builder.Property(l => l.Email).HasMaxLength(255);
        builder.Property(l => l.PieceIdentite).HasMaxLength(100);
        builder.Property(l => l.Profession).HasMaxLength(150);
        builder.Property(l => l.Adresse).HasColumnType("text");
        builder.Property(l => l.Notes).HasColumnType("text");
        builder.Property(l => l.CreatedAt).HasColumnType("timestamptz");
        builder.Property(l => l.UpdatedAt).HasColumnType("timestamptz");

        builder.HasOne(l => l.CreatedByUser)
               .WithMany(u => u.LocatairesCreated)
               .HasForeignKey(l => l.CreatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(l => l.UpdatedByUser)
               .WithMany()
               .HasForeignKey(l => l.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull);
    }
}

// ════════════════════════════════════════════════════════════════
// Configuration : Souscription
// ════════════════════════════════════════════════════════════════
public class SouscriptionConfiguration : IEntityTypeConfiguration<Souscription>
{
    public void Configure(EntityTypeBuilder<Souscription> builder)
    {
        builder.ToTable("souscriptions");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Ids).HasMaxLength(100).IsRequired();
        builder.Property(s => s.DateSouscription).HasColumnType("date").IsRequired();
        builder.Property(s => s.DateFin).HasColumnType("date");
        builder.Property(s => s.MontantLoyer).HasColumnType("numeric(12,2)").IsRequired();
        builder.Property(s => s.MontantCaution).HasColumnType("numeric(12,2)").HasDefaultValue(0m);
        builder.Property(s => s.MontantAvance).HasColumnType("numeric(12,2)").HasDefaultValue(0m);
        builder.Property(s => s.Statut).IsRequired();
        builder.Property(s => s.Conditions).HasColumnType("text");
        builder.Property(s => s.CreatedAt).HasColumnType("timestamptz");
        builder.Property(s => s.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(s => s.Ids).IsUnique();
        builder.HasIndex(s => s.MaisonId);
        builder.HasIndex(s => s.LocataireId);
        builder.HasIndex(s => s.Statut);

        builder.HasOne(s => s.Maison)
               .WithMany(m => m.Souscriptions)
               .HasForeignKey(s => s.MaisonId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Locataire)
               .WithMany(l => l.Souscriptions)
               .HasForeignKey(s => s.LocataireId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Reglements)
               .WithOne(r => r.Souscription)
               .HasForeignKey(r => r.SouscriptionId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CreatedByUser)
               .WithMany(u => u.SouscriptionsCreated)
               .HasForeignKey(s => s.CreatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.UpdatedByUser)
               .WithMany()
               .HasForeignKey(s => s.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull);
    }
}

// ════════════════════════════════════════════════════════════════
// Configuration : Reglement
// ════════════════════════════════════════════════════════════════
public class ReglementConfiguration : IEntityTypeConfiguration<Reglement>
{
    public void Configure(EntityTypeBuilder<Reglement> builder)
    {
        builder.ToTable("reglements");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Idr).HasMaxLength(100).IsRequired();
        builder.Property(r => r.DatePaiement).HasColumnType("date").IsRequired();
        builder.Property(r => r.MoisConcerne).HasColumnType("date").IsRequired();
        builder.Property(r => r.MontantAPayer).HasColumnType("numeric(12,2)").IsRequired();
        builder.Property(r => r.MontantPaye).HasColumnType("numeric(12,2)").HasDefaultValue(0m);
        builder.Property(r => r.Statut).IsRequired();
        builder.Property(r => r.Notes).HasColumnType("text");
        builder.Property(r => r.CreatedAt).HasColumnType("timestamptz");
        builder.Property(r => r.UpdatedAt).HasColumnType("timestamptz");

        // ResteAPayer est calculé en mémoire, pas persisté
        builder.Ignore(r => r.ResteAPayer);

        builder.HasIndex(r => r.Idr).IsUnique();
        builder.HasIndex(r => r.MoisConcerne);
        builder.HasIndex(r => r.Statut);

        builder.HasOne(r => r.Maison)
               .WithMany(m => m.Reglements)
               .HasForeignKey(r => r.MaisonId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Locataire)
               .WithMany(l => l.Reglements)
               .HasForeignKey(r => r.LocataireId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.CreatedByUser)
               .WithMany(u => u.ReglementsCreated)
               .HasForeignKey(r => r.CreatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(r => r.UpdatedByUser)
               .WithMany()
               .HasForeignKey(r => r.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull);
    }
}

// ════════════════════════════════════════════════════════════════
// Configuration : Depense
// ════════════════════════════════════════════════════════════════
public class DepenseConfiguration : IEntityTypeConfiguration<Depense>
{
    public void Configure(EntityTypeBuilder<Depense> builder)
    {
        builder.ToTable("depenses");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.TypeDepense).IsRequired();
        builder.Property(d => d.DateDepense).HasColumnType("date").IsRequired();
        builder.Property(d => d.Article).HasMaxLength(300).IsRequired();
        builder.Property(d => d.Quantite).HasColumnType("numeric(10,3)").HasDefaultValue(1m);
        builder.Property(d => d.PrixUnitaire).HasColumnType("numeric(12,2)").IsRequired();
        builder.Property(d => d.Observation).HasColumnType("text");
        builder.Property(d => d.PieceJustificative).HasMaxLength(500);
        builder.Property(d => d.CreatedAt).HasColumnType("timestamptz");
        builder.Property(d => d.UpdatedAt).HasColumnType("timestamptz");

        // Montant = propriété calculée en mémoire
        builder.Ignore(d => d.Montant);

        builder.HasIndex(d => d.TypeDepense);
        builder.HasIndex(d => d.DateDepense);

        builder.HasOne(d => d.Maison)
               .WithMany(m => m.Depenses)
               .HasForeignKey(d => d.MaisonId)
               .OnDelete(DeleteBehavior.Restrict)
               .IsRequired(false);

        builder.HasOne(d => d.Locataire)
               .WithMany(l => l.Depenses)
               .HasForeignKey(d => d.LocataireId)
               .OnDelete(DeleteBehavior.Restrict)
               .IsRequired(false);

        builder.HasOne(d => d.CreatedByUser)
               .WithMany(u => u.DepensesCreated)
               .HasForeignKey(d => d.CreatedBy)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(d => d.UpdatedByUser)
               .WithMany()
               .HasForeignKey(d => d.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
