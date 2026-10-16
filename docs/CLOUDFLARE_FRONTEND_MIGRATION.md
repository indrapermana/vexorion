# Cloudflare frontend migration runbook

Status: prepared, not cut over. Azure Static Web Apps remain the production rollback targets.

## Target topology

| Hostname | Service | Cloudflare Pages project |
| --- | --- | --- |
| `vexorionerp.com` | Public landing page | To be created with the landing-page implementation |
| `www.vexorionerp.com` | Redirect to the apex site | Configure after the landing page exists |
| `app.vexorionerp.com` | Main UI | `vexorionerp-app` |
| `admin.vexorionerp.com` | Admin UI | `vexorionerp-admin` |
| `pos.vexorionerp.com` | POS UI | `vexorionerp-pos` |
| `api.vexorionerp.com` | Existing ASP.NET Core API | Azure App Service; do not migrate or delete |

The frontend workflow uploads already-tested `dist` artifacts to Pages. It does not ask Cloudflare to rebuild the repository. This preserves the existing Turbo dependency graph and prevents unrelated applications from deploying.

## Effective build-watch scope

An application deploys only when Turbo produces its `dist` directory:

- Main UI: `VexorionERP.UI/**`
- Admin UI: `VexorionERP.AdminUI/**`
- POS UI: `VexorionERP.POS/**`
- All three: `packages/**`, `package.json`, `package-lock.json`, `turbo.json`, or relevant frontend workflow/action changes

Do not also connect these Direct Upload projects to Cloudflare Git integration. Doing so would create a second, untested build path and consume extra builds.

## Phase 1 — Cloudflare Pages projects (owner action)

In the same Cloudflare account used for WebPortal:

1. Open **Workers & Pages**.
2. Select **Create application** and choose **Pages / Direct Upload**.
3. Create these empty projects, using the names exactly as shown:
   - `vexorionerp-app`
   - `vexorionerp-admin`
   - `vexorionerp-pos`
4. A temporary placeholder upload is acceptable. Do not attach production domains yet.

Direct Upload is intentional because GitHub Actions performs the build, tests, affected-app selection, and artifact upload.

## Phase 2 — Cloudflare deployment credentials (owner action)

1. In Cloudflare, open **My Profile → API Tokens → Create Token → Custom token**.
2. Grant only **Account → Cloudflare Pages → Edit** for the account containing the three projects.
3. Copy the account ID from the Cloudflare dashboard.
4. In the VexorionERP GitHub repository, open **Settings → Secrets and variables → Actions**.
5. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
6. Confirm the existing `FRONTEND_PROD_API_BASE_URL` secret points to the public production API and includes `/api`, preferably:

   ```text
   https://api.vexorionerp.com/api
   ```

7. Add repository variable `CLOUDFLARE_PAGES_DEPLOY_ENABLED` with value `true`.

Until step 7 is completed, the new Cloudflare deployment jobs are safely skipped. Never commit token values or account IDs to the repository.

## Phase 3 — First deployment and temporary-host validation

1. Run the **Frontend** GitHub workflow manually with **deploy_all** enabled.
2. The workflow changes each Direct Upload project's production branch from the dashboard default (`main`) to this repository's production branch (`master`). Confirm that configuration step and all three Cloudflare jobs pass.
3. Test the generated hosts:
   - `https://vexorionerp-app.pages.dev`
   - `https://vexorionerp-admin.pages.dev`
   - `https://vexorionerp-pos.pages.dev`
4. For each application verify:
   - direct navigation and browser refresh on a nested route;
   - login, access-token refresh, logout, and expired-session handling;
   - authorization boundaries;
   - API calls target the production API hostname rather than the Pages hostname;
   - file upload and download where applicable;
   - browser console has no CORS, mixed-content, or CSP errors;
   - `_headers` supplies `nosniff`, frame protection, referrer policy, and immutable caching for hashed assets.

Do not continue if the production API secret is missing or points to localhost.

## Phase 4 — DNS authority and API hostname

If `vexorionerp.com` currently uses GoDaddy nameservers:

1. Inventory every existing DNS record in GoDaddy first, especially MX, SPF, DKIM, DMARC, verification, and application records.
2. Add `vexorionerp.com` to the same Cloudflare account as WebPortal.
3. Compare Cloudflare's imported records with the GoDaddy inventory and restore anything missing.
4. At GoDaddy, replace only the authoritative nameservers with the two nameservers assigned by Cloudflare.
5. Do not delete the domain registration and do not delete mail records.
6. Wait until Cloudflare reports the zone as active and verify website and email DNS records.

For `api.vexorionerp.com`, retain Azure App Service:

1. Add and validate the hostname in Azure App Service.
2. Enable its managed TLS certificate.
3. Create the required Cloudflare DNS CNAME to the Azure App Service hostname.
4. Verify `https://api.vexorionerp.com/health` or the application's deployed health endpoint before using it in frontend builds.

The backend already permits the planned `app`, `admin`, and `pos` origins. Confirm the deployed Azure configuration has not overridden that list with stale values.

## Phase 5 — Attach production frontend domains

In each Pages project, open **Custom domains → Set up a domain** and attach:

- `vexorionerp-app` → `app.vexorionerp.com`
- `vexorionerp-admin` → `admin.vexorionerp.com`
- `vexorionerp-pos` → `pos.vexorionerp.com`

Let Pages create the required DNS records. Do not manually point these names to Azure afterward.

Repeat the Phase 3 smoke tests on the production hostnames. Also verify that unauthorized cross-tenant access remains denied.

## Phase 6 — Landing page and apex domain

Implement and deploy the dedicated landing page before attaching `vexorionerp.com`. Its login action must use the absolute URL:

```text
https://app.vexorionerp.com/login
```

Attach both the apex domain and `www`, then configure `www` to redirect permanently to the apex hostname. This phase is deliberately separate from migrating the authenticated applications.

## Phase 7 — Azure retirement

Do not remove Azure Static Web Apps during DNS cutover.

After at least seven days of successful Cloudflare production operation:

1. Confirm recent Cloudflare deployments and all production smoke tests are healthy.
2. Disable the three Azure deploy jobs in `.github/workflows/frontend.yml`.
3. Preserve the previous Azure deployment details for rollback.
4. Remove only the three Azure **Static Web Apps** resources after confirming they do not contain the API, database, Blob Storage, custom certificates needed elsewhere, or shared monitoring resources.
5. Never remove Azure App Service, PostgreSQL, or Blob Storage as part of this frontend migration.

## Rollback

Before Azure retirement, rollback is a DNS change back to the existing Azure Static Web Apps custom-domain targets. If a Cloudflare deployment itself is faulty, use Pages deployment rollback or redeploy the last known-good commit. Keep DNS TTLs low during the cutover window, then restore normal TTLs after stability is established.
