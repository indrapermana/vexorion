# VexorionERP

[![Backend](https://github.com/indrapermana/vexorion/actions/workflows/backend.yml/badge.svg)](https://github.com/indrapermana/vexorion/actions/workflows/backend.yml)
[![Frontend](https://github.com/indrapermana/vexorion/actions/workflows/frontend.yml/badge.svg)](https://github.com/indrapermana/vexorion/actions/workflows/frontend.yml)

A full-stack SME ERP platform built with **ASP.NET Core 8**, **Entity Framework Core**, **PostgreSQL**, and three **React + Vite + MUI v6** frontends.

---

## Repository structure

```
VexorionERP/
├── VexorionERP/              # ASP.NET Core Web API (entry point)
├── VexorionERP.Models/       # Domain models and enumerations
├── VexorionERP.Database/     # EF Core DbContext, migrations, and seeding
├── VexorionERP.Services/     # Application services and CQRS handlers (Mediator)
├── VexorionERP.Handler/      # Additional CQRS command/query handlers
├── VexorionERP.Contracts/    # Request and response DTO contracts
├── VexorionERP.Services.Tests/   # Service-level unit tests
├── VexorionERP.Handler.Tests/    # Handler-level unit tests
├── VexorionERP.Web.Tests/        # Integration and web-layer tests
├── VexorionERP.UI/           # Main ERP frontend (finance dashboard, modules)
├── VexorionERP.AdminUI/      # Admin panel (tenants, users, roles, config)
└── VexorionERP.POS/          # Point-of-Sale cashier terminal
```

---

## Prerequisites

| Tool | Version |
|---|---|
| .NET SDK | 8.x |
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL | 14+ (running on port 5432) |
| dotnet-ef | latest |

Install the EF CLI tool globally if not already present:

```bash
dotnet tool install --global dotnet-ef
```

---

## Frontend Monorepo (Turborepo + Shared UI Package)

The three frontend apps are now managed as a JavaScript workspace monorepo at the repository root using **npm workspaces** and **Turborepo**.

### Workspace packages

- `VexorionERP.UI`
- `VexorionERP.AdminUI`
- `VexorionERP.POS`
- `packages/ui` (`@vexorion/ui` shared UI package)

### Root commands

Run these from repository root:

| Command | Description |
|---|---|
| `npm run dev` | Run all frontend `dev` tasks via Turbo (parallel) |
| `npm run build` | Build all frontend packages via Turbo |
| `npm run lint` | Run lint tasks via Turbo |
| `npm run test` | Run test tasks via Turbo |
| `npx turbo run build --filter=vexorionerp-adminui` | Build only AdminUI and its dependencies |
| `npx turbo run build --filter=vexorionerp-ui --filter=vexorionerp-pos` | Build selected apps only |

### Shared UI package version bump workflow

Use the root helper script to bump `@vexorion/ui` and automatically sync its dependency version in all three frontend apps.

| Command | Description |
|---|---|
| `npm run ui:version:patch` | Bump `packages/ui` patch version and sync app dependencies |
| `npm run ui:version:minor` | Bump minor version and sync app dependencies |
| `npm run ui:version:major` | Bump major version and sync app dependencies |
| `npm run ui:version -- 0.2.0` | Set an explicit target version |
| `npm run ui:version -- patch --dry-run` | Preview changes without writing files |

After a version bump, run:

```bash
npm install
npx turbo run build --filter=@vexorion/ui --filter=vexorionerp-ui --filter=vexorionerp-adminui --filter=vexorionerp-pos
```

This keeps the shared package and all app manifests in sync and validates downstream builds before commit.

---

## 1. Backend — `VexorionERP` (ASP.NET Core Web API)

The Web API serves all three frontends. It applies pending EF Core migrations automatically on startup.

### Setup

```bash
# From the repository root
dotnet restore
```

### Run

```bash
dotnet watch --project VexorionERP/VexorionERP.csproj --no-hot-reload
```

| URL | Purpose |
|---|---|
| `http://localhost:5000` | HTTP |
| `https://localhost:7171` | HTTPS |
| `https://localhost:7171/swagger` | Swagger UI (development only) |

### Database

The development connection string is in `VexorionERP/appsettings.Development.json`. Bootstrap seeding is enabled in development and runs once on first startup.

**Dev seed credentials:**

| Field | Value |
|---|---|
| Tenant code | `demo` |
| Admin username | `admin` |
| Admin email | `admin@demo.local` |
| Admin password | `DemoAdmin123!` |

> Re-seeding does not overwrite existing tenant data. To reset, drop and recreate the database.

### Run backend tests

```bash
# All test projects
dotnet test

# Specific project
dotnet test VexorionERP.Services.Tests/VexorionERP.Services.Tests.csproj
```

---

## 2. VexorionERP.UI — Main ERP Frontend

**Tech:** React 19 · TypeScript · Vite · MUI v6 · TanStack Query · react-i18next · Zustand · react-hook-form

The main ERP frontend used by finance and operations staff. Covers the finance dashboard, sales/purchase orders, invoices, inventory, journals, reports, and configuration pages.

### Key features

- Finance dashboard with KPI cards, aging analysis, cash flow charts, and health metrics
- Sales & purchase order management (orders → shipments/receipts → invoices → payments)
- Inventory adjustments, stock counts, and warehouse transfers
- Journal entries and fiscal period management
- Multi-language support (en-US, id-ID, es-ES)
- Light / dark theme toggle

### Dev server

```bash
cd VexorionERP.UI
npm install
npm run dev
```

Runs at **`http://localhost:5173`** (default Vite port). Proxies `/api/*` to `http://localhost:5000`.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:5000` | Backend target for Vite proxy |
| `VITE_API_BASE_URL` | `/api` | API base URL used in the browser |

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run test:run` | Run unit tests once (Vitest) |
| `npm test` | Run unit tests in watch mode |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:headed` | Run E2E tests with browser visible |
| `npm run e2e:ui` | Open Playwright interactive UI |
| `npm run e2e:report` | Open the last HTML report |

---

## 3. VexorionERP.AdminUI — Admin Panel

**Tech:** React 19 · TypeScript · Vite · MUI v6 · MUI X DataGrid · TanStack Query · react-i18next · react-hook-form

The internal admin panel for platform operators. Used to manage tenants, users, roles, product categories, tax/discount config, and menu visibility.

### Key features

- Tenant CRUD with company configuration
- User management: create, assign roles, reset password
- Role management and permission scopes
- Product categories, tax rates, and discount configuration
- Menu link visibility configuration per tenant

### Dev server

```bash
cd VexorionERP.AdminUI
npm install
npm run dev
```

Runs at **`http://localhost:5174`**. Proxies `/api/*` to `http://localhost:5000`.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:5000` | Backend target for Vite proxy |

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:headed` | Run E2E tests with browser visible |
| `npm run e2e:ui` | Open Playwright interactive UI |
| `npm run e2e:report` | Open the last HTML report |

---

## 4. VexorionERP.POS — Point-of-Sale Terminal

**Tech:** React 19 · TypeScript · Vite · MUI v6 · TanStack Query · Zustand · i18next · Playwright

A cashier-facing POS terminal for managing shifts, processing sales, handling returns/refunds, and printing receipts.

### Key features

- Shift open / close with opening float and variance reporting
- Product catalogue with cart management, discounts, and quantity editing
- Checkout with multiple payment methods and change calculation
- Receipt modal with print support and document references
- Return / refund flow with invoice search and partial-line selection
- Transaction history with reprint capability
- Role-based permission guards (e.g. `pos.refund` scope)
- Multi-language support (en-US, id-ID, es-ES)

### Dev server

```bash
cd VexorionERP.POS
npm install
npm run dev
```

Runs at **`http://localhost:5175`**. Proxies `/api/*` to `http://localhost:5000`.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:5000` | Backend target for Vite proxy |

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run e2e` | Run Playwright E2E tests (headless) |
| `npm run e2e:headed` | Run E2E tests with browser visible |
| `npm run e2e:ui` | Open Playwright interactive UI |
| `npm run e2e:report` | Open last HTML test report |

### Running E2E tests

The E2E tests require the backend and POS dev server to be running. Before the first run, the Playwright setup project authenticates via the UI and saves the session to `e2e/.auth/user.json`.

```bash
# In one terminal — start the backend
dotnet watch --project VexorionERP/VexorionERP.csproj --no-hot-reload

# In another terminal — start the POS dev server
cd VexorionERP.POS && npm run dev

# In a third terminal — run E2E tests
cd VexorionERP.POS && npm run e2e
```

Override credentials with environment variables if needed:

| Env var | Default |
|---|---|
| `E2E_TENANT_CODE` | `demo` |
| `E2E_USERNAME` | `admin@demo.local` |
| `E2E_PASSWORD` | `DemoAdmin123!` |
| `POS_BASE_URL` | `http://localhost:5175` |

---

## Running everything locally

```bash
# Terminal 1 — backend
dotnet watch --project VexorionERP/VexorionERP.csproj --no-hot-reload

# Terminal 2 — main ERP UI  (http://localhost:5173)
cd VexorionERP.UI && npm install && npm run dev

# Terminal 3 — admin panel  (http://localhost:5174)
cd VexorionERP.AdminUI && npm install && npm run dev

# Terminal 4 — POS terminal  (http://localhost:5175)
cd VexorionERP.POS && npm install && npm run dev
```

---

## Testing summary

| Project | Runner | Command | Tests |
|---|---|---|---|
| VexorionERP.Services.Tests | xUnit | `dotnet test` | backend services |
| VexorionERP.Handler.Tests | xUnit | `dotnet test` | CQRS handlers |
| VexorionERP.Web.Tests | xUnit | `dotnet test` | integration |
| VexorionERP.UI | Vitest | `npm run test:run` | frontend unit tests |
| VexorionERP.UI | Playwright | `npm run e2e` | frontend E2E workflows |
| VexorionERP.AdminUI | Vitest | `npm test` | admin panel unit tests |
| VexorionERP.AdminUI | Playwright | `npm run e2e` | admin panel E2E workflows |
| VexorionERP.POS | Vitest | `npm test` | POS unit tests |
| VexorionERP.POS | Playwright | `npm run e2e` | POS E2E workflows |

## CI workflows

GitHub Actions is split into four path-scoped workflows, and the badges at the top of this README show the latest status for each workflow.

| Workflow | File | Triggered by changes in |
|---|---|---|
| Backend | `.github/workflows/backend.yml` | `**.cs`, `**.csproj`, `**.sln`, or the workflow file itself |
| UI Frontend | `.github/workflows/ui.yml` | `VexorionERP.UI/**` or the workflow file itself |
| AdminUI Frontend | `.github/workflows/adminui.yml` | `VexorionERP.AdminUI/**` or the workflow file itself |
| POS Frontend | `.github/workflows/pos.yml` | `VexorionERP.POS/**` or the workflow file itself |

Each frontend workflow runs build, unit tests, and Playwright E2E tests. The backend workflow runs restore, release build, `.NET` tests, and uploads test/coverage artifacts.

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