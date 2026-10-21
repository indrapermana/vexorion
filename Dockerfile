# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0.301-noble AS build
WORKDIR /src

COPY ["VexorionERP/VexorionERP.csproj", "VexorionERP/"]
COPY ["VexorionERP.Contracts/VexorionERP.Contracts.csproj", "VexorionERP.Contracts/"]
COPY ["VexorionERP.Database/VexorionERP.Database.csproj", "VexorionERP.Database/"]
COPY ["VexorionERP.Handler/VexorionERP.Handler.csproj", "VexorionERP.Handler/"]
COPY ["VexorionERP.Models/VexorionERP.Models.csproj", "VexorionERP.Models/"]
COPY ["VexorionERP.Services/VexorionERP.Services.csproj", "VexorionERP.Services/"]
RUN dotnet restore "VexorionERP/VexorionERP.csproj"

COPY . .
RUN --mount=type=secret,id=sixlabors_license,required=true \
    dotnet publish "VexorionERP/VexorionERP.csproj" \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false \
    /p:SixLaborsLicenseFile=/run/secrets/sixlabors_license

FROM mcr.microsoft.com/dotnet/aspnet:10.0.12-noble AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

COPY --from=build --chown=app:app /app/publish .

USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "VexorionERP.dll"]
