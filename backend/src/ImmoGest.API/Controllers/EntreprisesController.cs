using ImmoGest.Domain.Entities;
using ImmoGest.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImmoGest.API.Controllers;

[ApiController]
[Route("api/entreprises")]
public class EntreprisesController : ControllerBase
{
    private readonly AppDbContext _db;

    public EntreprisesController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Récupère le profil de l'entreprise cliente active.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProfil(CancellationToken ct)
    {
        var entreprise = await _db.Entreprises.FirstOrDefaultAsync(ct);
        if (entreprise == null)
        {
            entreprise = new Entreprise
            {
                Denomination = "ImmoGest Agence Pro",
                AdressePostale = "01 BP 4550 Abidjan 01",
                AdressePhysique = "Boulevard de la République, Abidjan Plateau",
                Telephone = "+225 07 00 11 22 33",
                EmailCommercial = "contact@immogest.com",
                RccmIfu = "CI-ABJ-2026-B-88992",
                StatutSaaS = "Essai",
                DateDebutEssai = DateTime.UtcNow,
                DateFinEssai = DateTime.UtcNow.AddDays(14)
            };
            _db.Entreprises.Add(entreprise);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(entreprise);
    }

    /// <summary>
    /// Met à jour les informations d'identité (Dénomination, Adresse, Logo, etc.).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> UpdateProfil([FromBody] Entreprise dto, CancellationToken ct)
    {
        var entreprise = await _db.Entreprises.FirstOrDefaultAsync(ct);
        if (entreprise == null)
        {
            entreprise = new Entreprise();
            _db.Entreprises.Add(entreprise);
        }

        entreprise.Denomination = dto.Denomination ?? entreprise.Denomination;
        entreprise.AdressePostale = dto.AdressePostale;
        entreprise.AdressePhysique = dto.AdressePhysique;
        entreprise.Telephone = dto.Telephone;
        entreprise.EmailCommercial = dto.EmailCommercial;
        entreprise.RccmIfu = dto.RccmIfu;
        entreprise.LogoUrl = dto.LogoUrl;
        if (!string.IsNullOrEmpty(dto.Devise)) entreprise.Devise = dto.Devise;

        await _db.SaveChangesAsync(ct);
        return Ok(entreprise);
    }

    /// <summary>
    /// Administration Super-Admin : Liste de tous les comptes clients SaaS.
    /// </summary>
    [HttpGet("saas-clients")]
    public async Task<IActionResult> GetSaasClients(CancellationToken ct)
    {
        var clients = await _db.Entreprises.ToListAsync(ct);
        if (clients.Count == 0)
        {
            var defaultClient = new Entreprise
            {
                Denomination = "Agence Immobilière Ivoire Prestige",
                AdressePostale = "01 BP 4550 Abidjan 01",
                Telephone = "+225 07 00 11 22 33",
                EmailCommercial = "contact@ivoireprestige.com",
                StatutSaaS = "Essai",
                DateDebutEssai = DateTime.UtcNow.AddDays(-3),
                DateFinEssai = DateTime.UtcNow.AddDays(11),
                EstBloque = false
            };
            _db.Entreprises.Add(defaultClient);
            await _db.SaveChangesAsync(ct);
            clients = new List<Entreprise> { defaultClient };
        }

        return Ok(clients);
    }

    /// <summary>
    /// Action Administrateur : Bloquer / Débloquer un compte client.
    /// </summary>
    [HttpPost("{id}/toggle-block")]
    public async Task<IActionResult> ToggleBlock(Guid id, CancellationToken ct)
    {
        var entreprise = await _db.Entreprises.FindAsync(new object[] { id }, ct);
        if (entreprise == null) return NotFound(new { error = "Entreprise introuvable." });

        entreprise.EstBloque = !entreprise.EstBloque;
        entreprise.StatutSaaS = entreprise.EstBloque ? "Bloque" : "Actif";

        await _db.SaveChangesAsync(ct);
        return Ok(entreprise);
    }

    /// <summary>
    /// Action Administrateur : Prolonger l'essai de 14 jours.
    /// </summary>
    [HttpPost("{id}/prolonger-essai")]
    public async Task<IActionResult> ProlongerEssai(Guid id, CancellationToken ct)
    {
        var entreprise = await _db.Entreprises.FindAsync(new object[] { id }, ct);
        if (entreprise == null) return NotFound(new { error = "Entreprise introuvable." });

        entreprise.DateFinEssai = entreprise.DateFinEssai.AddDays(14);
        entreprise.StatutSaaS = "Essai";
        entreprise.EstBloque = false;

        await _db.SaveChangesAsync(ct);
        return Ok(entreprise);
    }
}
