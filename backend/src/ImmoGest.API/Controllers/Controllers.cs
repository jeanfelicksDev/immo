using ImmoGest.Application.DTOs;
using ImmoGest.Application.Interfaces;
using ImmoGest.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ImmoGest.API.Controllers;

// ────────────────────────────────────────────────────────────────
// Classe de base pour tous les controllers ImmoGest
// ────────────────────────────────────────────────────────────────
[ApiController]
[Authorize]
public abstract class BaseController : ControllerBase
{
    protected Guid CurrentUserId => Guid.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("Utilisateur non identifié.")
    );

    protected string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "Agent";
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Authentification
// ════════════════════════════════════════════════════════════════
[Route("api/auth")]
public class AuthController : BaseController
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    /// <summary>Connexion avec email et mot de passe. Retourne les tokens JWT.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
        => Ok(await _auth.LoginAsync(req, ct));

    /// <summary>Création d'un nouveau compte utilisateur (Public / Inscription).</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req, CancellationToken ct)
        => Ok(await _auth.RegisterAsync(req, ct));

    /// <summary>Rafraîchissement du token d'accès via le refresh token.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshTokenRequest req, CancellationToken ct)
        => Ok(await _auth.RefreshTokenAsync(req.RefreshToken, ct));

    /// <summary>Révocation du refresh token (déconnexion).</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var email = User.FindFirstValue(ClaimTypes.Email)!;
        await _auth.RevokeTokenAsync(email, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Dashboard
// ════════════════════════════════════════════════════════════════
[Route("api/dashboard")]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboard;
    public DashboardController(IDashboardService dashboard) => _dashboard = dashboard;

    /// <summary>Retourne les KPIs globaux pour le tableau de bord avec filtres optionnels.</summary>
    [HttpGet("kpis")]
    public async Task<ActionResult<DashboardKpisDto>> GetKpis(
        [FromQuery] Guid? proprietaireId = null,
        [FromQuery] Guid? locataireId = null,
        [FromQuery] DateOnly? dateDebut = null,
        [FromQuery] DateOnly? dateFin = null,
        CancellationToken ct = default)
        => Ok(await _dashboard.GetKpisAsync(proprietaireId, locataireId, dateDebut, dateFin, ct));
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Propriétaires
// ════════════════════════════════════════════════════════════════
[Route("api/proprietaires")]
public class ProprietairesController : BaseController
{
    private readonly IProprietaireService _service;
    public ProprietairesController(IProprietaireService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProprietaireDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDesc = false,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(new PagedRequest(page, pageSize, search, sortBy, sortDesc), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProprietaireDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ProprietaireDto>> Create([FromBody] CreateProprietaireRequest req, CancellationToken ct)
    {
        var result = await _service.CreateAsync(req, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ProprietaireDto>> Update(Guid id, [FromBody] UpdateProprietaireRequest req, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, req, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Maisons
// ════════════════════════════════════════════════════════════════
[Route("api/maisons")]
public class MaisonsController : BaseController
{
    private readonly IMaisonService _service;
    public MaisonsController(IMaisonService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<MaisonDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDesc = false, [FromQuery] bool? disponible = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(new PagedRequest(page, pageSize, search, sortBy, sortDesc), disponibleOnly: disponible, ct: ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MaisonDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("idm/{idm}")]
    public async Task<ActionResult<MaisonDto>> GetByIdm(string idm, CancellationToken ct)
    {
        var result = await _service.GetByIdmAsync(idm, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("generate-idm")]
    public async Task<ActionResult<string>> GenerateIdm(
        [FromQuery] Domain.Enums.TypeConstruction type,
        [FromQuery] int nbPieces,
        [FromQuery] decimal loyer,
        [FromQuery] string ville,
        CancellationToken ct)
        => Ok(await _service.GenerateIdmAsync(type, nbPieces, loyer, ville, ct));

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<MaisonDto>> Create([FromBody] CreateMaisonRequest req, CancellationToken ct)
    {
        var result = await _service.CreateAsync(req, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<MaisonDto>> Update(Guid id, [FromBody] UpdateMaisonRequest req, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, req, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Locataires
// ════════════════════════════════════════════════════════════════
[Route("api/locataires")]
public class LocatairesController : BaseController
{
    private readonly ILocataireService _service;
    public LocatairesController(ILocataireService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<LocataireDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] bool sortDesc = false,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(new PagedRequest(page, pageSize, search, SortDesc: sortDesc), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LocataireDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<LocataireDto>> Create([FromBody] CreateLocataireRequest req, CancellationToken ct)
    {
        var result = await _service.CreateAsync(req, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<LocataireDto>> Update(Guid id, [FromBody] UpdateLocataireRequest req, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, req, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Souscriptions
// ════════════════════════════════════════════════════════════════
[Route("api/souscriptions")]
public class SouscriptionsController : BaseController
{
    private readonly ISouscriptionService _service;
    public SouscriptionsController(ISouscriptionService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<SouscriptionDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDesc = false, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(new PagedRequest(page, pageSize, search, sortBy, sortDesc), ct: ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SouscriptionDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("locataire/{locataireId:guid}")]
    public async Task<ActionResult<List<SouscriptionDto>>> GetByLocataire(Guid locataireId, CancellationToken ct)
        => Ok(await _service.GetByLocataireAsync(locataireId, ct));

    [HttpGet("{id:guid}/print")]
    public async Task<IActionResult> PrintContrat(Guid id, CancellationToken ct)
    {
        var pdf = await _service.GenerateContratPdfAsync(id, ct);
        return File(pdf, "application/pdf", $"contrat_{id}.pdf");
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<SouscriptionDto>> Create([FromBody] CreateSouscriptionRequest req, CancellationToken ct)
    {
        var result = await _service.CreateAsync(req, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<SouscriptionDto>> Update(Guid id, [FromBody] UpdateSouscriptionRequest req, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, req, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Règlements
// ════════════════════════════════════════════════════════════════
[Route("api/reglements")]
public class ReglementsController : BaseController
{
    private readonly IReglementService _service;
    public ReglementsController(IReglementService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ReglementDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] bool sortDesc = true,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(new PagedRequest(page, pageSize, search, SortDesc: sortDesc), ct: ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReglementDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("impayes")]
    public async Task<ActionResult<List<ReglementDto>>> GetImpayes(CancellationToken ct)
        => Ok(await _service.GetImapyesAsync(ct));

    [HttpGet("{id:guid}/recu")]
    public async Task<IActionResult> GetRecu(Guid id, CancellationToken ct)
    {
        var pdf = await _service.GenerateRecuPdfAsync(id, ct);
        return File(pdf, "application/pdf", $"recu_{id}.pdf");
    }

    [HttpGet("recu-groupes")]
    public async Task<IActionResult> GetRecusGroupes([FromQuery] int annee, [FromQuery] int mois, CancellationToken ct)
    {
        var pdf = await _service.GenerateRecusGroupesPdfAsync(annee, mois, ct);
        return File(pdf, "application/pdf", $"reçus_{annee}_{mois:D2}.pdf");
    }

    [HttpPost]
    public async Task<ActionResult<ReglementDto>> Create([FromBody] CreateReglementRequest req, CancellationToken ct)
    {
        var result = await _service.CreateAsync(req, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("batch")]
    public async Task<ActionResult<List<ReglementDto>>> CreateBatch([FromBody] CreateReglementsBatchRequest req, CancellationToken ct)
        => Ok(await _service.CreateBatchAsync(req, CurrentUserId, ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ReglementDto>> Update(Guid id, [FromBody] UpdateReglementRequest req, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, req, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Dépenses
// ════════════════════════════════════════════════════════════════
[Route("api/depenses")]
public class DepensesController : BaseController
{
    private readonly IDepenseService _service;
    public DepensesController(IDepenseService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<DepenseDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] bool sortDesc = true,
        [FromQuery] Domain.Enums.TypeDepense? type = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(new PagedRequest(page, pageSize, search, SortDesc: sortDesc), type: type, ct: ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DepenseDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("maison/{maisonId:guid}")]
    public async Task<ActionResult<List<DepenseDto>>> GetByMaison(Guid maisonId, CancellationToken ct)
        => Ok(await _service.GetByMaisonAsync(maisonId, ct));

    [HttpGet("locataire/{locataireId:guid}")]
    public async Task<ActionResult<List<DepenseDto>>> GetByLocataire(Guid locataireId, CancellationToken ct)
        => Ok(await _service.GetByLocataireAsync(locataireId, ct));

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<DepenseDto>> Create([FromBody] CreateDepenseRequest req, CancellationToken ct)
    {
        var result = await _service.CreateAsync(req, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/piece-justificative")]
    [Authorize]
    public async Task<ActionResult<string>> UploadPieceJustificative(
        Guid id, IFormFile file, CancellationToken ct)
    {
        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { error = "Fichier trop volumineux (max 10 Mo)." });

        var allowedTypes = new[] { "application/pdf", "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { error = "Type de fichier non autorisé." });

        var path = await _service.UploadPieceJustificativeAsync(id, file.OpenReadStream(), file.FileName, ct);
        return Ok(new { path });
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<DepenseDto>> Update(Guid id, [FromBody] UpdateDepenseRequest req, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, req, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}

// ════════════════════════════════════════════════════════════════
// CONTROLLER : Gestion des Comptes Utilisateurs
// ════════════════════════════════════════════════════════════════
[Route("api/utilisateurs")]
public class UtilisateursController : BaseController
{
    private readonly ImmoGest.Infrastructure.Data.AppDbContext _db;
    public UtilisateursController(ImmoGest.Infrastructure.Data.AppDbContext db) => _db = db;

    /// <summary>Liste tous les comptes utilisateurs avec leurs statuts.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<UtilisateurDto>>> GetAll(CancellationToken ct)
    {
        var list = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
            _db.Utilisateurs
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UtilisateurDto(
                    u.Id,
                    u.NomComplet,
                    u.Email,
                    u.Role,
                    u.EstActif,
                    u.CreatedAt
                )),
            ct
        );

        return Ok(list);
    }

    /// <summary>Bloquer (désactiver) ou débloquer (activer) un compte utilisateur.</summary>
    [HttpPut("{id:guid}/toggle-status")]
    [AllowAnonymous]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] ToggleUserStatusRequest req, CancellationToken ct)
    {
        var user = await _db.Utilisateurs.FindAsync([id], ct);
        if (user is null) return NotFound(new { error = "Utilisateur introuvable." });

        user.EstActif = req.EstActif;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new UtilisateurDto(
            user.Id,
            user.NomComplet,
            user.Email,
            user.Role,
            user.EstActif,
            user.CreatedAt
        ));
    }

    /// <summary>Suppression d'un compte utilisateur.</summary>
    [HttpDelete("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var user = await _db.Utilisateurs.FindAsync([id], ct);
        if (user is null) return NotFound();

        _db.Utilisateurs.Remove(user);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
