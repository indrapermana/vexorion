# VexorionERP

ERP platform built with ASP.NET Core, Entity Framework Core, PostgreSQL, and a React + Vite frontend.

## Solution layout

- `VexorionERP` ASP.NET Core Web API
- `VexorionERP.Models` domain models
- `VexorionERP.Database` EF Core persistence layer and migrations
- `VexorionERP.Services` application services and CQRS handlers
- `VexorionERP.Contracts` request and response contracts
- `VexorionERP.Services.Tests` focused service tests
- `VexorionERP.Web.Tests` web and integration tests
- `VexorionERP.UI` React + Vite + MUI frontend

## Prerequisites

- .NET 8 SDK
- Node.js 20+ and npm
- PostgreSQL running locally on port `5432`
- `dotnet-ef` CLI tool for migration commands

Install EF CLI if needed:

```bash
dotnet tool install --global dotnet-ef
```

## Backend setup and run

Restore and run the backend from the repository root:

```bash
dotnet restore
dotnet watch --project VexorionERP/VexorionERP.csproj --no-hot-reload
```

Development URLs from launch settings:

- `http://localhost:5000`
- `https://localhost:7171`

Swagger UI is available in development at:

- `https://localhost:7171/swagger`

The application applies pending EF Core migrations automatically on startup when using the relational PostgreSQL database.

## Frontend setup and run

From the repository root:

```bash
cd VexorionERP.UI
npm install
npm run dev
```

The Vite development server proxies `/api/*` requests to `http://localhost:5000` by default. You can override that target with `VITE_API_PROXY_TARGET`.

The frontend API client uses `/api` by default and can be pointed elsewhere with `VITE_API_BASE_URL`.

## Local development database

The development backend configuration uses the `DefaultConnection` value in `VexorionERP/appsettings.Development.json`.

Bootstrap seed data is enabled in development. On first startup, the app seeds:

- Tenant code: `demo`
- Admin username: `admin`
- Admin email: `admin@demo.local`

The current development password in config is:

- `DemoAdmin123!`

If you change bootstrap settings after the first seed, existing tenant data will not be recreated automatically.

## Migration commands

Run these from the repository root.

Add a migration:

```bash
dotnet ef migrations add <MigrationName> --project VexorionERP.Database/VexorionERP.Database.csproj --startup-project VexorionERP/VexorionERP.csproj
```

Remove the most recent migration:

```bash
dotnet ef migrations remove --project VexorionERP.Database/VexorionERP.Database.csproj --startup-project VexorionERP/VexorionERP.csproj
```

Update the database manually:

```bash
dotnet ef database update --project VexorionERP.Database/VexorionERP.Database.csproj --startup-project VexorionERP/VexorionERP.csproj
```

List migrations:

```bash
dotnet ef migrations list --project VexorionERP.Database/VexorionERP.Database.csproj --startup-project VexorionERP/VexorionERP.csproj
```

## Useful validation commands

```bash
dotnet build VexorionERP.sln
dotnet test VexorionERP.Services.Tests/VexorionERP.Services.Tests.csproj
dotnet test VexorionERP.Web.Tests/VexorionERP.Web.Tests.csproj
cd VexorionERP.UI && npm run build
```

## API examples

See `VexorionERP/VexorionERP.http` for a few local development requests:

- login
- current user
- product listing and creation
- inventory balance listing

For local HTTPS requests outside the IDE, you may need to trust the ASP.NET Core development certificate:

```bash
dotnet dev-certs https --trust
```