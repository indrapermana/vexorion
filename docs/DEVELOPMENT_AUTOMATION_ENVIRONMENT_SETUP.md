# Development Automation Environment Setup

This runbook describes the isolated non-production environment used by GitHub Actions and Playwright. It is intentionally separate from production and may be destroyed and recreated without affecting customer data.

## Resulting architecture

| Component | Development resource |
|---|---|
| GCP project | `vexorionerp-development` |
| GCP project number | `888068706979` |
| Region | `asia-southeast2` |
| Artifact Registry | `vexorionerp-api` |
| Cloud Run API | `vexorionerp-api-development` |
| Cloud Run migration job | `vexorionerp-db-migrate-development` |
| Runtime identity | `vexorionerp-api-dev@vexorionerp-development.iam.gserviceaccount.com` |
| Migration identity | `vexorionerp-migration-dev@vexorionerp-development.iam.gserviceaccount.com` |
| GitHub deployer | `vexorionerp-github-dev@vexorionerp-development.iam.gserviceaccount.com` |
| Neon database | `vexorionerp_development` |
| Neon runtime role | `vexorion_runtime_development` |
| Neon migration role | `vexorion_migrator_development` |
| R2 document bucket | `vexorionerp-development-documents` (private) |
| R2 image bucket | `vexorionerp-development-product-images` |
| Public image domain | `https://dev-images.vexorionerp.com` |
| Git branch | `develop` |
| GitHub environment | `development` |

## 1. Create and select the GCP project

Create `vexorionerp-development`, attach billing, and label it with:

```text
application=vexorionerp
environment=development
managed-by=github-actions
```

Create or select a local gcloud configuration:

```bash
gcloud config configurations create vexorionerp-development
gcloud config set project vexorionerp-development
gcloud config set run/region asia-southeast2
```

Enable the required APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project=vexorionerp-development
```

## 2. Create Artifact Registry

Create the Docker repository:

```bash
gcloud artifacts repositories create vexorionerp-api \
  --project=vexorionerp-development \
  --location=asia-southeast2 \
  --repository-format=docker \
  --description='VexorionERP development API container images'
```

Configure cleanup policies to retain the five newest images and delete untagged images older than seven days. Begin with `cleanupPolicyDryRun: true` and review candidates before enabling deletion.

## 3. Create the Neon database and least-privilege roles

Create a Neon development project in Singapore with PostgreSQL 18, then create database `vexorionerp_development`.

Create separate roles for schema migration and application runtime. Neither role may retain `neon_superuser`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, or `BYPASSRLS`.

The migration role requires database connection and schema creation privileges. The runtime role requires only connection, schema usage, table DML, sequence usage, and application function execution:

```sql
GRANT CONNECT ON DATABASE vexorionerp_development
TO vexorion_runtime_development;

GRANT USAGE ON SCHEMA public
TO vexorion_runtime_development;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO vexorion_runtime_development;

GRANT USAGE, SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public
TO vexorion_runtime_development;

GRANT EXECUTE
ON ALL FUNCTIONS IN SCHEMA public
TO vexorion_runtime_development;
```

Connect as the migration role when setting defaults for future objects:

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
TO vexorion_runtime_development;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES
TO vexorion_runtime_development;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS
TO vexorion_runtime_development;
```

Use a direct, non-pooled connection for migrations and the pooled connection for runtime traffic. Verify the runtime role cannot create database or schema objects:

```sql
SELECT
    has_database_privilege(current_user, current_database(), 'CREATE'),
    has_schema_privilege(current_user, 'public', 'CREATE');
```

Both values must be `false` when connected as `vexorion_runtime_development`.

## 4. Create Cloudflare R2 development storage

Create:

- Private bucket `vexorionerp-development-documents`.
- Product-image bucket `vexorionerp-development-product-images`.
- Custom image domain `dev-images.vexorionerp.com`.

Create an account API token with Object Read & Write access scoped only to those two buckets. Do not expose the document bucket publicly. Store the token credentials in Google Secret Manager; do not put them in GitHub.

## 5. Create Google service accounts

Create three keyless identities:

```bash
gcloud iam service-accounts create vexorionerp-api-dev \
  --project=vexorionerp-development \
  --display-name='VexorionERP Development API Runtime'

gcloud iam service-accounts create vexorionerp-migration-dev \
  --project=vexorionerp-development \
  --display-name='VexorionERP Development Database Migration'

gcloud iam service-accounts create vexorionerp-github-dev \
  --project=vexorionerp-development \
  --display-name='VexorionERP Development GitHub Deployment'
```

Do not create or download service-account keys.

## 6. Create Secret Manager resources

Create these secret resources and add version `1`:

| Secret | Consumer |
|---|---|
| `vexorionerp-development-db-connection` | Runtime service account |
| `vexorionerp-development-db-migration-connection` | Migration service account |
| `vexorionerp-development-jwt-secret` | Runtime service account |
| `vexorionerp-development-r2-access-key-id` | Runtime service account |
| `vexorionerp-development-r2-secret-access-key` | Runtime service account |
| `vexorionerp-development-grafana-loki-api-key` | Runtime service account |

Grant access on each individual secret. The GitHub deployer must not have Secret Manager access. Pin API runtime secrets to explicit tested versions. The deployment workflow resolves the migration connection through `latest`; only publish a new enabled migration-secret version after validating it, and disable the previous version after a successful deployment.

## 7. Configure Grafana Loki

Create a development `logs:write` Cloud Access Policy/token. The same Grafana stack may be used, but the development environment has its own token. Store only the API key in Secret Manager; configure the Loki URL and instance/user ID as non-secret Cloud Run settings.

## 8. Configure GitHub Workload Identity Federation

Create pool `github-actions` and provider `vexorionerp-develop` using GitHub's OIDC issuer. Map:

```text
google.subject=assertion.sub
attribute.repository=assertion.repository
attribute.repository_owner=assertion.repository_owner
attribute.ref=assertion.ref
attribute.workflow_ref=assertion.workflow_ref
```

Use this exact provider condition:

```text
assertion.repository=='indrapermana/vexorion' && assertion.repository_owner=='indrapermana' && assertion.ref=='refs/heads/develop' && assertion.workflow_ref=='indrapermana/vexorion/.github/workflows/backend.yml@refs/heads/develop'
```

Grant the matching repository principal set `roles/iam.workloadIdentityUser` on `vexorionerp-github-dev`. Grant that deployer:

- `roles/run.admin` in the development project.
- `roles/artifactregistry.writer` on repository `vexorionerp-api`.
- `roles/iam.serviceAccountUser` on the runtime and migration identities.

## 9. Seed the initial image, migration job, and API

Build the first image with the SixLabors license supplied as a BuildKit secret. Push it to Artifact Registry and resolve its immutable digest.

Create migration job `vexorionerp-db-migrate-development` with:

- Migration service account.
- Immutable image digest.
- `--vexorion-operation=migrate`.
- `ASPNETCORE_ENVIRONMENT=Production`.
- `ConnectionStrings__MigrationConnection` mapped from the validated migration-secret version (the workflow resolves `latest`).
- No retry and a bounded timeout.

Execute the job and require a successful completion before deploying the API.

Configure service `vexorionerp-api-development` with:

- Runtime service account.
- 1 vCPU, 512 MiB, min 0, max 1, concurrency 80, timeout 300 seconds.
- Startup/liveness `/health/live` and readiness `/health/ready` probes.
- Public invocation enabled; application authorization remains enforced.
- Runtime connection, JWT, R2, and Loki secret mappings.
- Development R2 bucket/domain settings and Loki endpoint/instance ID.

Verify `/health/live` and `/health/ready` return `Healthy`, and an anonymous request to `/api/auth/me` returns HTTP 401.

## 10. Bootstrap the E2E control identity

Run the bootstrap operation against the development Neon database to create the protected control tenant and SystemAdmin identity:

```text
Tenant code: vexorionerp
Company code: AUTO
Username: e2e-control-admin
```

Keep its password in the team password manager. Confirm login and `/api/auth/me`; the control identity is used only during Playwright global setup to provision disposable `e2e-*` tenants. Tests run as the generated tenant identity and global teardown deletes it and checks for orphans.

## 11. Configure the GitHub development environment

Create environment `development`, restrict it to branch `develop`, and add:

### Variables

```text
GCP_PROJECT_ID=vexorionerp-development
GCP_REGION=asia-southeast2
GCP_ARTIFACT_REPOSITORY=vexorionerp-api
GCP_CLOUD_RUN_SERVICE=vexorionerp-api-development
GCP_MIGRATION_JOB=vexorionerp-db-migrate-development
GCP_MIGRATION_SERVICE_ACCOUNT=vexorionerp-migration-dev@vexorionerp-development.iam.gserviceaccount.com
GCP_MIGRATION_CONNECTION_SECRET=vexorionerp-development-db-migration-connection
GCP_IMAGE_NAME=api
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/888068706979/locations/global/workloadIdentityPools/github-actions/providers/vexorionerp-develop
GCP_DEPLOY_SERVICE_ACCOUNT=vexorionerp-github-dev@vexorionerp-development.iam.gserviceaccount.com
E2E_API_ENVIRONMENT=development
E2E_ALLOW_TENANT_PROVISIONING=true
E2E_ALLOW_REMOTE_NON_PRODUCTION=true
E2E_ALLOWED_REMOTE_HOST=<development-cloud-run-hostname-without-scheme-or-path>
```

### Secrets

```text
SIXLABORS_LICENSE_FILE=<complete license-file contents>
E2E_API_BASE_URL=https://<development-cloud-run-host>/api
E2E_CONTROL_TENANT_CODE=vexorionerp
E2E_CONTROL_USERNAME=e2e-control-admin
E2E_CONTROL_PASSWORD=<password-manager value>
```

`FRONTEND_DEV_API_BASE_URL` is currently reserved for a future deployed development frontend. Playwright supplies `E2E_API_BASE_URL` to the Vite servers it starts on the runner. Runtime application secrets remain in Google Secret Manager and must not be copied to GitHub.

## 12. Deployment and test flow

Pushing backend changes to `develop` runs `.github/workflows/backend.yml`. The workflow authenticates without a key, builds and pushes an immutable image, updates and executes the migration job, and updates Cloud Run only after migration succeeds.

Remote Playwright is deliberately manual. In GitHub Actions, run the Frontend workflow against `develop` with:

```text
run_e2e=true
deploy_all=false
```

The workflow runs Main UI, AdminUI, and POS suites independently against the development API. It refuses production and unapproved hosts, requires the exact configured development hostname, provisions an isolated tenant, and records sanitized artifacts. Do not enable automatic E2E on every push until execution time, reliability, and free-tier consumption have been observed.

## 13. Operational checks

Before accepting the environment:

1. Migration job execution completes successfully.
2. Latest Cloud Run revision is ready and receives 100% traffic.
3. Both health endpoints return `Healthy`.
4. Anonymous `/api/auth/me` returns 401.
5. Control login works and reports `SystemAdmin` and `TenantAdmin`.
6. Runtime Neon role can use application objects but cannot create database/schema objects.
7. Product images are readable from `dev-images.vexorionerp.com`.
8. Document bucket remains private.
9. Loki receives development logs.
10. Playwright cleanup deletes the generated tenant and reports no orphan.

## Security boundaries

- Production hosts and protected tenant codes are always rejected by E2E lifecycle tooling.
- Remote automation requires both the explicit non-production opt-in and exact hostname allowlist.
- GitHub can deploy but cannot read runtime or migration secret values.
- Runtime and migration identities have separate database credentials and Secret Manager access.
- R2 document objects are private; signed URLs are time-limited.
- Never paste credentials, tokens, connection strings, or license contents into this runbook, workflow YAML, logs, or commits.
