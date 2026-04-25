# VexorionERP

ERP platform built with ASP.NET Core, Entity Framework Core, PostgreSQL, Identity, and a React + Vite frontend.

## Projects

- `VexorionERP` ASP.NET Core Web API
- `VexorionERP.Models` domain models
- `VexorionERP.Database` EF Core persistence layer
- `VexorionERP.Services` application services and CQRS handlers
- `VexorionERP.Services.Tests` focused service tests
- `VexorionERP.Web.Tests` web integration tests
- `VexorionERP.UI` React + Vite + MUI frontend

## Backend development

```bash
dotnet watch --project VexorionERP --no-hot-reload
```

Default backend URLs from launch settings:

- `http://localhost:5125`
- `https://localhost:7171`

## Frontend development

```bash
cd VexorionERP.UI
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:5125` by default, so you can run the backend and frontend side by side without adding browser CORS configuration for local development.

## Validation

```bash
dotnet build VexorionERP.sln
dotnet test VexorionERP.Services.Tests/VexorionERP.Services.Tests.csproj
dotnet test VexorionERP.Web.Tests/VexorionERP.Web.Tests.csproj
cd VexorionERP.UI && npm run build
```