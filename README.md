# VexorionERP

[![Backend](https://github.com/indrapermana/vexorion/actions/workflows/backend.yml/badge.svg)](https://github.com/indrapermana/vexorion/actions/workflows/backend.yml)
[![Frontend](https://github.com/indrapermana/vexorion/actions/workflows/frontend.yml/badge.svg)](https://github.com/indrapermana/vexorion/actions/workflows/frontend.yml)

A full-stack SME ERP platform built with **ASP.NET Core 10**, **Entity Framework Core 10**, **PostgreSQL**, and three **React + Vite + MUI v6** frontends.

For verified implementation status, known mismatches, priorities, and upcoming work, use the single [consolidated development plan](DEVELOPMENT_PLAN.md). Historical milestone and roadmap checklists have been retired.

---

## Repository structure

```
VexorionERP/
├── VexorionERP/              # ASP.NET Core Web API (entry point)
├── VexorionERP.Models/       # Domain models and enumerations
├── VexorionERP.Database/     # EF Core DbContext and migrations
├── VexorionERP.Services/     # Application services and CQRS handlers (Mediator)
├── VexorionERP.Handler/      # Additional CQRS command/query handlers
├── VexorionERP.Contracts/    # Request and response DTO contracts
├── VexorionERP.Services.Tests/   # Service-level unit tests
├── VexorionERP.Handler.Tests/    # Handler-level unit tests
├── VexorionERP.Web.Tests/        # Integration and web-layer tests
├── VexorionERP.UI/           # Main ERP frontend (finance dashboard, modules)
├── VexorionERP.AdminUI/      # Admin panel (tenants, users, roles, config)
├── VexorionERP.POS/          # Point-of-Sale cashier terminal
└── VexorionERP.LandingPage/  # Public product landing page
```

---

## Prerequisites

| Tool | Version |
|---|---|
| .NET SDK | 10.x |
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL | 14+ (running on port 5432) |
| dotnet-ef | latest |

Install the EF CLI tool globally if not already present:

```bash
dotnet tool install --global dotnet-ef
```

---

## Current deployment status

The public landing page and authenticated frontends are deployed through Cloudflare Pages:

| Application | URL | Current evidence |
|---|---|---|
| Landing page | `https://vexorionerp.com` | Cloudflare Pages migration completed |
| Main UI | `https://app.vexorionerp.com` | Login manually confirmed by the owner on 20 October 2026 |
| Admin UI | `https://admin.vexorionerp.com` | Login manually confirmed by the owner on 20 October 2026 |
| POS | `https://pos.vexorionerp.com` | Login manually confirmed by the owner on 20 October 2026 |

This is deployment smoke evidence, not full release validation. The API, database, and object-storage migration is tracked in [the Azure exit plan](docs/VEXORIONERP_AZURE_MIGRATION_PLAN.md). Azure resources must not be retired until the replacement backend passes its migration and rollback gates.

The backend supports provider-selectable Azure Blob Storage and Cloudflare R2 adapters. Production uses R2 with separate buckets: private documents are served through short-lived signed URLs, while non-sensitive product images use a dedicated public HTTPS custom domain. Configure secrets only through managed environment variables; the tracked development example contains placeholders.

## Local Setup Guide (for new/junior developers)

This section walks you through getting the full stack running on a fresh machine from scratch.

### Step 1 — Install prerequisites

1. **[.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)** — confirm with `dotnet --version` (expect `10.x.xxx`)
2. **[Node.js 20 LTS](https://nodejs.org/)** — confirm with `node -v` (expect `v20.x.x`)
3. **PostgreSQL 14+** — must be running on port 5432
   - **macOS (recommended):** [Postgres.app](https://postgresapp.com/) — drag-and-drop install, no configuration needed. After installing, open the app and click **Start**. Add the CLI tools to your PATH as shown in the app's instructions:
     ```bash
     # Add to ~/.zshrc (or ~/.bash_profile)
     export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
     ```
     Then reload: `source ~/.zshrc`
   - **Other platforms / alternative:** [Official PostgreSQL installer](https://www.postgresql.org/download/)
   - **Recommended GUI tool:** [TablePlus](https://tableplus.com/) (macOS-native) or [pgAdmin](https://www.pgadmin.org/)
4. **EF Core CLI tool** (once, globally):
   ```bash
   dotnet tool install --global dotnet-ef
   ```

### Step 2 — Clone and restore

```bash
git clone <repository-url>
cd VexorionERP

# Restore .NET dependencies
dotnet restore

# Install all frontend dependencies (all three apps + shared UI package in one command)
npm install
```

### Step 3 — Configure the database connection

Create your ignored local configuration from the tracked example, then edit it with your local PostgreSQL credentials:

```bash
cp VexorionERP/appsettings.Development.example.json \
  VexorionERP/appsettings.Development.json
```

`appsettings.Development.json` is Git-ignored. Keep both `DefaultConnection` and `MigrationConnection`; for local development they may use the same PostgreSQL connection.

> **Postgres.app users (macOS):** The default superuser is your macOS username (not `postgres`) and has no password. Your connection string will look like:
> Use `Username=<your-macos-username>;Password=` in both connection strings.
> You can confirm your username with `whoami` in the terminal.

> The runtime connection can later be pooled while `MigrationConnection` must remain a privileged direct connection.

### Step 4 — Create the database and run migrations

Create the database in PostgreSQL (you can do this via pgAdmin or psql):

```sql
CREATE DATABASE vexorionerp;
```

Normal API startup never applies migrations. Apply them through the explicit operation:

```bash
dotnet run --project VexorionERP/VexorionERP.csproj -- \
  --vexorion-operation=migrate
```

### Step 5 — Provision the initial tenant

Set a strong `Bootstrap:AdminPassword` value in your ignored `appsettings.Development.json`, then run the one-time idempotent provisioning operation:

```bash
dotnet run --project VexorionERP/VexorionERP.csproj -- \
  --vexorion-operation=bootstrap
```

Alternatively, `--vexorion-operation=provision` applies migrations and performs bootstrap in one explicit command. Ordinary API startup cannot trigger bootstrap.

**Configured bootstrap identity:**

| Field | Value |
|---|---|
| Tenant code | `vexorionerp` |
| Username | `admin` |
| Email | `admin@demo.local` |
| Password | The value stored in `Bootstrap:AdminPassword` |

### Step 6 — Trust the HTTPS development certificate (first time only)

```bash
dotnet dev-certs https --trust
```

Accept the security dialog that appears. You only need to do this once per machine.

### Step 7 — Run the backend

Open a terminal and run:

```bash
dotnet watch --project VexorionERP/VexorionERP.csproj --no-hot-reload
```

Wait until you see output like `Now listening on: https://localhost:7171`. Verify it is working by opening `https://localhost:7171/swagger` in your browser (you should see the Swagger UI).

### Step 8 — Run the frontend(s)

Each frontend runs on its own port. Open a new terminal for each one you need:

```bash
# Main ERP UI — http://localhost:5173
cd VexorionERP.UI && npm run dev

# Admin panel — http://localhost:5174  (open in a separate terminal)
cd VexorionERP.AdminUI && npm run dev

# POS terminal — http://localhost:5175  (open in a separate terminal)
cd VexorionERP.POS && npm run dev
```

You do **not** need to run all three at once — start only the app(s) relevant to what you are working on.

> All three frontends call the relative `/api` path and proxy it to `https://localhost:7171` through Vite during local development. The proxy accepts the trusted ASP.NET development certificate, so browser requests stay same-origin and require no local CORS changes. Copy each application's `.env.example` only when you need to override these defaults.

### Step 9 — Log in

Navigate to `http://localhost:5173` (main ERP UI) or `http://localhost:5174` (admin panel) and log in with:

- **Tenant code:** `vexorionerp`
- **Email:** `admin@demo.local`
- **Password:** your local `Bootstrap:AdminPassword` value

### Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `dotnet watch` fails with `Failed to connect to database` | PostgreSQL is not running or credentials are wrong | Start PostgreSQL and verify the connection string in `appsettings.Development.json` |
| `npm install` fails with peer dependency errors | Node version is too old | Upgrade to Node 20 LTS |
| Browser shows certificate warning on `localhost:7171` | Dev cert not trusted | Run `dotnet dev-certs https --trust` |
| Frontend shows "Network Error" or blank page | Backend is not running | Start the backend first (Step 7) |
| Login returns 401 even with correct credentials | Bootstrap was not run or credentials differ | Run the explicit bootstrap operation and use its configured tenant/admin values |
| Port already in use | Another process is using the port | Stop the conflicting process, or change the port in `launchSettings.json` / `vite.config.ts` |

---

## Frontend Monorepo (Turborepo + Shared UI Package)

The four frontend apps are managed as a JavaScript workspace monorepo at the repository root using **npm workspaces** and **Turborepo**.

### Workspace packages

- `VexorionERP.UI`
- `VexorionERP.AdminUI`
- `VexorionERP.POS`
- `VexorionERP.LandingPage`
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

The Web API serves all three frontends. Normal startup validates database connectivity and schema state but never applies migrations or bootstrap data automatically.

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

Copy `appsettings.Development.example.json` to the ignored `appsettings.Development.json`, then set local database credentials and `Bootstrap:AdminPassword` there. Normal startup is read-only with respect to schema and bootstrap data; use the explicit provisioning commands in the setup guide.

**Configured bootstrap identity:**

| Field | Value |
|---|---|
| Tenant code | `vexorionerp` |
| Admin username | `admin` |
| Admin email | `admin@demo.local` |
| Admin password | Your local `Bootstrap:AdminPassword` value |

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

Runs at **`http://localhost:5173`** (default Vite port). Proxies `/api/*` to `https://localhost:7171`.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `https://localhost:7171` | Backend target for the local Vite proxy |
| `VITE_API_BASE_URL` | `/api` | API base URL used in the browser |

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run test:run` | Run unit tests once (Vitest) |
| `npm test` | Run unit tests once (Vitest) |
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

Runs at **`http://localhost:5174`**. Proxies `/api/*` to `https://localhost:7171`.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `https://localhost:7171` | Backend target for the local Vite proxy |
| `VITE_API_BASE_URL` | `/api` | API base URL used in the browser |

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

Runs at **`http://localhost:5175`**. Proxies `/api/*` to `https://localhost:7171`.

| Env var | Default | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `https://localhost:7171` | Backend target for the local Vite proxy |
| `VITE_API_BASE_URL` | `/api` | API base URL used in the browser |

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

The current E2E fixtures still contain legacy local fallbacks. Override them for every newly provisioned or shared environment:

| Environment variable | Legacy local fallback |
|---|---|
| `E2E_TENANT_CODE` | `demo` |
| `E2E_USERNAME` | `admin@demo.local` |
| `E2E_PASSWORD` | `DemoAdmin123!` |
| `POS_BASE_URL` | `http://localhost:5175` |

These fallbacks refer to the older local `demo` database and must never be treated as deployment credentials. For a newly provisioned environment, use the `vexorionerp` bootstrap tenant and its managed password. For the cross-tenant project scenario, supply an active local **SystemAdmin** account because the test provisions and removes a temporary tenant B:

```bash
cd VexorionERP.UI
E2E_TENANT_CODE='<your-tenant-code>' \
E2E_USERNAME='<your-system-admin-email-or-username>' \
E2E_PASSWORD='<your-password>' \
npx playwright test e2e/projects-cross-tenant.spec.ts
```

Do not commit these credentials or add them to tracked environment files.

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

From the repository root, `npm run test:run` runs Main UI, AdminUI, and POS unit tests sequentially and reports every failing workspace before exiting. A successful unit-test or build job is not E2E or release evidence.

| Project | Runner | Command | Tests |
|---|---|---|---|
| VexorionERP.Services.Tests | xUnit | `dotnet test` | backend services |
| VexorionERP.Handler.Tests | xUnit | `dotnet test` | CQRS handlers |
| VexorionERP.Web.Tests | xUnit | `dotnet test` | integration |
| All frontend applications | Vitest | `npm run test:run` from repository root | Main UI, AdminUI, and POS unit tests |
| VexorionERP.UI | Vitest | `npm run test:run` in workspace | Main UI unit tests |
| VexorionERP.UI | Playwright | `npm run e2e` | frontend E2E workflows |
| VexorionERP.AdminUI | Vitest | `npm run test:run` | admin panel unit tests |
| VexorionERP.AdminUI | Playwright | `npm run e2e` | admin panel E2E workflows |
| VexorionERP.POS | Vitest | `npm run test:run` | POS unit tests |
| VexorionERP.POS | Playwright | `npm run e2e` | POS E2E workflows |

## CI workflows

GitHub Actions uses two path-scoped workflows, and the badges at the top of this README show the latest status for each workflow.

| Workflow | File | Triggered by changes in |
|---|---|---|
| Backend | `.github/workflows/backend.yml` | `**.cs`, `**.csproj`, `**.sln`, or the workflow file itself |
| Frontend | `.github/workflows/frontend.yml` | Any frontend application, shared package, root frontend configuration, or frontend workflow change |

The frontend workflow builds, type-checks, lints, and unit-tests affected packages and uploads test, coverage, and distribution artifacts. Its three Playwright jobs are currently hard-disabled in workflow conditions; even after they are enabled, missing credentials can skip execution. A skipped E2E job is not a passing E2E or release gate. The backend workflow runs restore, Release build, `.NET` tests, and uploads test/coverage artifacts before deployment eligibility.

The authenticated frontends and public landing page deploy to Cloudflare Pages through explicit deployment gates. The production API runs on Google Cloud Run, PostgreSQL runs on Neon, and object storage uses Cloudflare R2.

### Infrastructure setup guides

- [Architecture and workflow diagrams](docs/VEXORIONERP_ARCHITECTURE_DIAGRAMS.md)
- [Neon PostgreSQL production setup](docs/NEON_PRODUCTION_SETUP.md)
- [Google Cloud Run production setup](docs/GOOGLE_CLOUD_RUN_PRODUCTION_SETUP.md)
- [Cloudflare R2 production setup](docs/CLOUDFLARE_R2_SETUP.md)
- [Cloudflare Pages setup for the three authenticated UIs](docs/CLOUDFLARE_PAGES_UI_SETUP.md)
- [Historical Cloudflare frontend migration runbook](docs/CLOUDFLARE_FRONTEND_MIGRATION.md)

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

Apply migrations through the explicit application operation:

```bash
dotnet run --project VexorionERP/VexorionERP.csproj -- \
  --vexorion-operation=migrate
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
