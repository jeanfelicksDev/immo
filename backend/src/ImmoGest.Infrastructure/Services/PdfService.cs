using ImmoGest.Application.DTOs;
using ImmoGest.Application.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ImmoGest.Infrastructure.Services;

/// <summary>
/// Service de génération PDF utilisant la bibliothèque QuestPDF.
/// Génère : contrats de location et reçus de paiement.
/// </summary>
public class PdfService : IPdfService
{
    static PdfService()
    {
        // Licence QuestPDF (Community = gratuit pour open source)
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ─── Contrat de Location ─────────────────────────────────────────
    public Task<byte[]> GenerateContratAsync(SouscriptionDto s, CancellationToken ct = default)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(11));

                page.Header().Column(col =>
                {
                    col.Item().AlignCenter().Text("CONTRAT DE LOCATION").FontSize(18).Bold().FontColor("#1a237e");
                    col.Item().AlignCenter().Text($"Référence : {s.Ids}").FontSize(12).FontColor("#546e7a");
                    col.Item().Height(10);
                    col.Item().LineHorizontal(1).LineColor("#1a237e");
                    col.Item().Height(10);
                });

                page.Content().Column(col =>
                {
                    // Section : Parties
                    col.Item().Text("ENTRE LES PARTIES").FontSize(13).Bold().FontColor("#1a237e");
                    col.Item().Height(8);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols => { cols.RelativeColumn(); cols.RelativeColumn(); });

                        table.Cell().Background("#e8eaf6").Padding(5).Text("PROPRIÉTAIRE / BAILLEUR").Bold();
                        table.Cell().Background("#e8eaf6").Padding(5).Text("LOCATAIRE / PRENEUR").Bold();

                        table.Cell().Padding(5).Text(s.VilleMaison);
                        table.Cell().Padding(5).Text(s.NomLocataire);

                        table.Cell().Padding(5).Text(s.ContactLocataire ?? "N/A");
                        table.Cell().Padding(5).Text(s.ContactLocataire ?? "N/A");
                    });

                    col.Item().Height(15);

                    // Section : Bien loué
                    col.Item().Text("BIEN IMMOBILIER LOUÉ").FontSize(13).Bold().FontColor("#1a237e");
                    col.Item().Height(8);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols => { cols.ConstantColumn(180); cols.RelativeColumn(); });

                        void Row(string label, string value)
                        {
                            table.Cell().Background("#f5f5f5").Padding(4).Text(label).Bold();
                            table.Cell().Padding(4).Text(value);
                        }

                        Row("Référence du bien (IDM)", s.IdmMaison);
                        Row("Type de bien", s.TypeConstructionMaison);
                        Row("Localisation", $"{s.VilleMaison}");
                    });

                    col.Item().Height(15);

                    // Section : Conditions financières
                    col.Item().Text("CONDITIONS FINANCIÈRES").FontSize(13).Bold().FontColor("#1a237e");
                    col.Item().Height(8);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols => { cols.ConstantColumn(180); cols.RelativeColumn(); });

                        void Row(string label, string value)
                        {
                            table.Cell().Background("#f5f5f5").Padding(4).Text(label).Bold();
                            table.Cell().Padding(4).Text(value);
                        }

                        Row("Montant mensuel du loyer", $"{s.MontantLoyer:N0} FCFA");
                        Row("Dépôt de garantie (caution)", $"{s.MontantCaution:N0} FCFA");
                        Row("Avance sur loyer", $"{s.MontantAvance:N0} FCFA");
                        Row("Date de début", s.DateSouscription.ToString("dd/MM/yyyy"));
                        Row("Date de fin", s.DateFin?.ToString("dd/MM/yyyy") ?? "Indéterminée");
                        Row("Durée du contrat", s.NbMoisContrat.HasValue ? $"{s.NbMoisContrat} mois" : "Open-ended");
                    });

                    if (!string.IsNullOrWhiteSpace(s.Conditions))
                    {
                        col.Item().Height(15);
                        col.Item().Text("CONDITIONS PARTICULIÈRES").FontSize(13).Bold().FontColor("#1a237e");
                        col.Item().Height(5);
                        col.Item().Border(1).BorderColor("#cfd8dc").Padding(8).Text(s.Conditions);
                    }

                    // Signatures
                    col.Item().Height(30);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols => { cols.RelativeColumn(); cols.RelativeColumn(); });

                        table.Cell().Padding(5).Column(c =>
                        {
                            c.Item().Text("Signature du Bailleur").Bold();
                            c.Item().Height(40);
                            c.Item().Text("Date : _______________");
                        });

                        table.Cell().Padding(5).Column(c =>
                        {
                            c.Item().Text("Signature du Locataire").Bold();
                            c.Item().Height(40);
                            c.Item().Text("Date : _______________");
                        });
                    });
                });

                page.Footer().AlignCenter()
                    .Text($"Document généré le {DateTime.Now:dd/MM/yyyy à HH:mm} — ImmoGest SaaS")
                    .FontSize(9).FontColor("#90a4ae");
            });
        });

        return Task.FromResult(document.GeneratePdf());
    }

    // ─── Reçu de Paiement ────────────────────────────────────────────
    public Task<byte[]> GenerateRecuAsync(ReglementDto r, CancellationToken ct = default)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A5.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("REÇU DE LOYER").FontSize(16).Bold().FontColor("#1a237e");
                            c.Item().Text($"N° {r.Idr}").FontSize(11).FontColor("#546e7a");
                        });
                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text($"Date : {r.DatePaiement:dd/MM/yyyy}").Bold();
                            c.Item().Text($"Mois : {r.MoisConcerne:MM/yyyy}");
                        });
                    });
                    col.Item().Height(5).LineHorizontal(1).LineColor("#1a237e");
                });

                page.Content().Column(col =>
                {
                    col.Item().Height(10);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols => { cols.ConstantColumn(140); cols.RelativeColumn(); });

                        void Row(string label, string value, bool highlight = false)
                        {
                            var bg = highlight ? "#e8eaf6" : "#ffffff";
                            table.Cell().Background(bg).Padding(4).Text(label).Bold();
                            table.Cell().Background(bg).Padding(4).Text(value);
                        }

                        Row("Locataire", r.NomLocataire);
                        Row("Contact", r.ContactLocataire ?? "N/A");
                        Row("Bien loué (IDM)", r.IdmMaison);
                        Row("Ville", r.VilleMaison);
                        Row("Loyer dû", $"{r.MontantAPayer:N0} FCFA");
                        Row("Montant payé", $"{r.MontantPaye:N0} FCFA", highlight: true);
                        Row("Reste à payer", $"{r.ResteAPayer:N0} FCFA",
                            highlight: r.ResteAPayer > 0);
                        Row("Statut", r.Statut);
                    });
                });

                page.Footer().Row(row =>
                {
                    row.RelativeItem().Text("Signature et cachet de l'agence")
                        .FontSize(9).FontColor("#78909c");
                    row.ConstantItem(200).AlignRight()
                        .Text($"ImmoGest — {DateTime.Now:dd/MM/yyyy HH:mm}")
                        .FontSize(9).FontColor("#78909c");
                });
            });
        });

        return Task.FromResult(document.GeneratePdf());
    }

    // ─── Fusion de PDFs ───────────────────────────────────────────────
    public Task<byte[]> MergeAsync(IEnumerable<byte[]> pdfs, CancellationToken ct = default)
    {
        // Implémentation simple : concaténation des bytes (pour une vraie fusion, utiliser PdfSharp ou iText)
        // Dans un contexte production, remplacer par une vraie bibliothèque de merge PDF
        var result = new List<byte>();
        foreach (var pdf in pdfs)
            result.AddRange(pdf);

        return Task.FromResult(result.ToArray());
    }
}
