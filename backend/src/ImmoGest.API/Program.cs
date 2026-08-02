using ImmoGest.Application.Interfaces;
using ImmoGest.Domain.Enums;
using ImmoGest.Infrastructure.Data;
using ImmoGest.Infrastructure.Security;
using ImmoGest.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ════════════════════════════════════════════════════════════════
// 1. BASE DE DONNÉES — PostgreSQL + Entity Framework Core + Enums
// ════════════════════════════════════════════════════════════════
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Chaîne de connexion DefaultConnection manquante.");

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<RoleUtilisateur>("immogest.role_utilisateur");
dataSourceBuilder.MapEnum<TypeConstruction>("immogest.type_construction");
dataSourceBuilder.MapEnum<TypeDepense>("immogest.type_depense");
dataSourceBuilder.MapEnum<StatutSouscription>("immogest.statut_souscription");
dataSourceBuilder.MapEnum<StatutPaiement>("immogest.statut_paiement");
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        dataSource,
        npgsql => npgsql
            .MigrationsAssembly("ImmoGest.Infrastructure")
            .EnableRetryOnFailure(maxRetryCount: 3, TimeSpan.FromSeconds(5), null)
    )
);

// ════════════════════════════════════════════════════════════════
// 2. INJECTION DE DÉPENDANCES — Services métier
// ════════════════════════════════════════════════════════════════
builder.Services.AddScoped<IJwtService,          JwtService>();
builder.Services.AddScoped<IAuthService,         AuthService>();
builder.Services.AddScoped<IDashboardService,    DashboardService>();
builder.Services.AddScoped<IProprietaireService, ProprietaireService>();
builder.Services.AddScoped<IMaisonService,       MaisonService>();
builder.Services.AddScoped<ILocataireService,    LocataireService>();
builder.Services.AddScoped<ISouscriptionService, SouscriptionService>();
builder.Services.AddScoped<IReglementService,    ReglementService>();
builder.Services.AddScoped<IDepenseService,      DepenseService>();
builder.Services.AddScoped<IPdfService,          PdfService>();

// ════════════════════════════════════════════════════════════════
// 3. AUTHENTIFICATION JWT
// ════════════════════════════════════════════════════════════════
var jwtSecret = builder.Configuration["JWT:Secret"]
    ?? throw new InvalidOperationException("JWT:Secret manquant dans la configuration.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer           = true,
        ValidIssuer              = builder.Configuration["JWT:Issuer"],
        ValidateAudience         = true,
        ValidAudience            = builder.Configuration["JWT:Audience"],
        ValidateLifetime         = true,
        ClockSkew                = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",       policy => policy.RequireRole("Administrateur"));
    options.AddPolicy("GestionnaireUp",  policy => policy.RequireRole("Administrateur", "Gestionnaire"));
    options.AddPolicy("AllRoles",        policy => policy.RequireRole("Administrateur", "Gestionnaire", "Agent"));
});

// ════════════════════════════════════════════════════════════════
// 4. CORS — Autorisations frontend
// ════════════════════════════════════════════════════════════════
builder.Services.AddCors(options =>
{
    options.AddPolicy("ImmoGestCors", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ════════════════════════════════════════════════════════════════
// 5. API + SWAGGER
// ════════════════════════════════════════════════════════════════
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = null;
        opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "ImmoGest API",
        Version     = "v1",
        Description = "API RESTful de gestion immobilière SaaS multi-rôles",
        Contact     = new OpenApiContact { Name = "ImmoGest Team", Email = "dev@immogest.com" }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Entrez votre JWT token : Bearer {votre_token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Health Checks
builder.Services.AddHealthChecks();

// ════════════════════════════════════════════════════════════════
// 6. PIPELINE HTTP
// ════════════════════════════════════════════════════════════════
var app = builder.Build();

// Auto-initialisation et création automatique des tables en base de données
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.EnsureCreatedAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Database Init Warning]: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ImmoGest API v1");
        c.RoutePrefix = "swagger";
    });
}

// Middleware d'erreurs global
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (KeyNotFoundException ex)
    {
        ctx.Response.StatusCode = 404;
        await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (UnauthorizedAccessException ex)
    {
        ctx.Response.StatusCode = 401;
        await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        ctx.Response.StatusCode = 409;
        await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (ArgumentException ex)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
    catch (Exception ex)
    {
        ctx.Response.StatusCode = 500;
        var detail = app.Environment.IsDevelopment() ? ex.ToString() : "Une erreur interne est survenue.";
        await ctx.Response.WriteAsJsonAsync(new { error = detail });
    }
});

app.UseHttpsRedirection();
app.UseCors("ImmoGestCors");
app.UseAuthentication();
app.UseAuthorization();

// Middleware pour injecter l'utilisateur courant dans le DbContext APRÈS l'authentification
app.Use(async (ctx, next) =>
{
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        var subClaim = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                    ?? ctx.User.FindFirst("sub");

        if (subClaim is not null && Guid.TryParse(subClaim.Value, out var userId))
        {
            var dbContext = ctx.RequestServices.GetRequiredService<AppDbContext>();
            dbContext.SetCurrentUser(userId);
        }
    }
    await next();
});

app.UseStaticFiles();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
