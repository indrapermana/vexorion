# VexorionERP

[![Backend](https://github.com/indrapermana/vexorion/actions/workflows/backend.yml/badge.svg)](https://github.com/indrapermana/vexorion/actions/workflows/backend.yml)
[![Frontend](https://github.com/indrapermana/vexorion/actions/workflows/frontend.yml/badge.svg)](https://github.com/indrapermana/vexorion/actions/workflows/frontend.yml)

A full-stack SME ERP platform built with **ASP.NET Core 8**, **Entity Framework Core**, **PostgreSQL**, and three **React + Vite + MUI v6** frontends.

For verified implementation status, known mismatches, priorities, and upcoming work, use the single [consolidated development plan](DEVELOPMENT_PLAN.md). Historical milestone and roadmap checklists have been retired.

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

## Local Setup Guide (for new/junior developers)

This section walks you through getting the full stack running on a fresh machine from scratch.

### Step 1 — Install prerequisites

1. **[.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)** — confirm with `dotnet --version` (expect `8.x.xxx`)
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

Open `VexorionERP/appsettings.Development.json` and update the connection string to match your local PostgreSQL setup:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=127.0.0.1;Port=5432;Database=vexorionerp;Username=postgres;Password=<your-password>;Include Error Detail=True;"
}
```

> **Postgres.app users (macOS):** The default superuser is your macOS username (not `postgres`) and has no password. Your connection string will look like:
> ```json
> "DefaultConnection": "Host=127.0.0.1;Port=5432;Database=vexorionerp;Username=<your-macos-username>;Password=;Include Error Detail=True;"
> ```
> You can confirm your username with `whoami` in the terminal.

> Leave all other values (`Jwt`, `Bootstrap`, etc.) as-is for local development.

### Step 4 — Create the database and run migrations

Create the database in PostgreSQL (you can do this via pgAdmin or psql):

```sql
CREATE DATABASE vexorionerp;
```

The API applies pending migrations automatically on startup, so no manual migration step is needed. If you prefer to apply migrations manually before running the API:

```bash
dotnet ef database update \
  --project VexorionERP.Database/VexorionERP.Database.csproj \
  --startup-project VexorionERP/VexorionERP.csproj
```

### Step 5 — Enable dev seed data

In `VexorionERP/appsettings.Development.json`, set `Bootstrap.Enabled` to `true`:

```json
"Bootstrap": {
  "Enabled": true,
  ...
}
```

Start the API once (Step 6 below), let it seed, then set `Enabled` back to `false` to prevent re-seeding on subsequent restarts.

**Default seed credentials:**

| Field | Value |
|---|---|
| Tenant code | `demo` |
| Username | `admin` |
| Email | `admin@demo.local` |
| Password | `DemoAdmin123!` |

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

> The frontends proxy all `/api/*` requests to `http://localhost:5000` automatically via Vite's dev proxy, so you do not need to configure CORS or change any URLs.

### Step 9 — Log in

Navigate to `http://localhost:5173` (main ERP UI) or `http://localhost:5174` (admin panel) and log in with:

- **Tenant code:** `demo`
- **Email:** `admin@demo.local`
- **Password:** `DemoAdmin123!`

### Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `dotnet watch` fails with `Failed to connect to database` | PostgreSQL is not running or credentials are wrong | Start PostgreSQL and verify the connection string in `appsettings.Development.json` |
| `npm install` fails with peer dependency errors | Node version is too old | Upgrade to Node 20 LTS |
| Browser shows certificate warning on `localhost:7171` | Dev cert not trusted | Run `dotnet dev-certs https --trust` |
| Frontend shows "Network Error" or blank page | Backend is not running | Start the backend first (Step 7) |
| Login returns 401 even with correct credentials | Seed data not applied | Confirm `Bootstrap.Enabled` was `true` on the first run |
| Port already in use | Another process is using the port | Stop the conflicting process, or change the port in `launchSettings.json` / `vite.config.ts` |

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
