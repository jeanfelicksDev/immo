# ─────────────────────────────────────────────────────────────
# Dockerfile — ImmoGest API (.NET 8)
# Multi-stage build : Build → Publish → Runtime
# ─────────────────────────────────────────────────────────────

# Stage 1 : Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copier les fichiers projet et restaurer les dépendances (cache layer)
COPY ["src/ImmoGest.API/ImmoGest.API.csproj", "src/ImmoGest.API/"]
COPY ["src/ImmoGest.Application/ImmoGest.Application.csproj", "src/ImmoGest.Application/"]
COPY ["src/ImmoGest.Domain/ImmoGest.Domain.csproj", "src/ImmoGest.Domain/"]
COPY ["src/ImmoGest.Infrastructure/ImmoGest.Infrastructure.csproj", "src/ImmoGest.Infrastructure/"]
RUN dotnet restore "src/ImmoGest.API/ImmoGest.API.csproj"

# Copier le reste du code source
COPY . .

# Compiler et publier
WORKDIR "/src/src/ImmoGest.API"
RUN dotnet build "ImmoGest.API.csproj" -c Release -o /app/build
RUN dotnet publish "ImmoGest.API.csproj" -c Release -o /app/publish --no-restore

# Stage 2 : Runtime (image légère)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Répertoire uploads pour les pièces justificatives
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Copier les artefacts publiés
COPY --from=build /app/publish .

# Utilisateur non-root pour la sécurité
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "ImmoGest.API.dll"]
