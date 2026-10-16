# Cloudflare frontend migration runbook

Status: Cloudflare static cutover complete; Azure retirement in progress. Azure API-backed validation and Azure Static Web Apps resource deletion remain pending.

## Target topology

| Hostname | Service | Cloudflare Pages project |
| --- | --- | --- |
| `vexorionerp.com` | Public landing page | `vexorionerp-landing` |
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
- Landing page: `VexorionERP.LandingPage/**`
- All affected consumers: `packages/**`, `package.json`, `package-lock.json`, `turbo.json`, or relevant frontend workflow/action changes

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

### Verified pre-migration baseline (2026-10-16)

- `vexorionerp.com` resolves to GoDaddy Website Builder at `76.223.105.230` and `13.248.243.5` and returns HTTP 200.
- `www.vexorionerp.com` redirects to the apex site.
- All three `*.pages.dev` deployments return HTTP 200 with the expected security headers.
- The existing Azure `app`, `admin`, and `pos` custom domains resolve but return HTTP 404.
- `api.vexorionerp.com` resolves to Azure App Service but `/health` returns `403 Site Disabled`. Restore/start the Azure App Service before login or API smoke tests; changing DNS will not fix a disabled application.
- No public apex MX, SPF, or other apex TXT records were returned. Preserve any additional records visible in GoDaddy even if they are not currently public.

### 4A — Add and verify the Cloudflare zone

1. In the same Cloudflare account as WebPortal, select **Add a domain** and enter `vexorionerp.com`.
2. Select the Free plan and allow Cloudflare to scan the current DNS records.
3. Before changing nameservers, make Cloudflare's DNS table match this inventory:

   | Type | Name | Target/value | Proxy during migration |
   | --- | --- | --- | --- |
   | A | `@` | `76.223.105.230` | DNS only |
   | A | `@` | `13.248.243.5` | DNS only |
   | CNAME | `www` | `vexorionerp.com` | DNS only |
   | CNAME | `app` | `proud-plant-059c31a00.7.azurestaticapps.net` | DNS only |
   | CNAME | `admin` | `ambitious-bay-0a07d0f00.7.azurestaticapps.net` | DNS only |
   | CNAME | `pos` | `ashy-stone-0c83b9c00.7.azurestaticapps.net` | DNS only |
   | CNAME | `api` | `vexorionerp-c9f3gbcegtfybdhe.southeastasia-01.azurewebsites.net` | DNS only |
   | TXT | `asuid.api` | `F1FC1E71634468087CB306E647B66C03E143868ED227C09FB702C05DCC2D15C6` | Not applicable |
   | TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | Not applicable |

4. Do not copy the GoDaddy NS or SOA records. Cloudflare supplies authoritative NS and SOA records.
5. The `_domainconnect` CNAME is GoDaddy automation metadata and is not required once Cloudflare is authoritative. It may be omitted.
6. If GoDaddy shows any record not listed above, copy it to Cloudflare before continuing—especially MX, SPF, DKIM, CAA, ownership-verification, or third-party service records.
7. Take a screenshot/export of the completed Cloudflare DNS table.

Keeping every web record **DNS only** for this step makes the nameserver change an authority migration only. Do not point `app`, `admin`, or `pos` to Pages until Phase 5.

### 4B — Change authoritative nameservers at GoDaddy

1. Copy the two nameservers assigned by Cloudflare for `vexorionerp.com`.
2. In GoDaddy, open the domain's **Nameservers** settings (not the individual DNS record editor).
3. Choose **Change nameservers / Enter my own nameservers** and enter the two Cloudflare values exactly.
4. Do not cancel the GoDaddy domain registration and do not delete the old DNS records during the transition.
5. Wait until Cloudflare reports the zone as **Active**. Nameserver propagation can take time.
6. Verify the authoritative NS records, the apex website, `www`, `api`, and all recorded TXT/MX records before Phase 5.

### 4C — Restore and verify the Azure API

Owner-deferred on 2026-10-16 because the Azure subscription requires remediation. Phase 5 may proceed for the frontend DNS/TLS cutover, but API-backed behavior must remain **not validated** until this section passes. This exception does not authorize Azure Static Web Apps retirement.

Retain Azure App Service for `api.vexorionerp.com`:

1. In Azure Portal, open the VexorionERP App Service and check **Overview → Status**. Start it if stopped.
2. If Azure still returns `403 Site Disabled`, check subscription/resource status, App Service Plan status/quota, and deployment health before changing frontend DNS.
3. Confirm `api.vexorionerp.com` remains configured under the App Service custom domains and that its managed TLS certificate is healthy.
4. Preserve both the `api` CNAME and `asuid.api` TXT record.
5. Verify `https://api.vexorionerp.com/health` (or the deployed health endpoint) returns the intended healthy response.
6. Confirm the deployed backend CORS configuration permits `https://app.vexorionerp.com`, `https://admin.vexorionerp.com`, and `https://pos.vexorionerp.com`.

Do not attach the production frontend domains or update `FRONTEND_PROD_API_BASE_URL` to an unusable API until this check passes.

## Phase 5 — Attach production frontend domains

In each Pages project, open **Custom domains → Set up a domain** and attach:

- `vexorionerp-app` → `app.vexorionerp.com`
- `vexorionerp-admin` → `admin.vexorionerp.com`
- `vexorionerp-pos` → `pos.vexorionerp.com`

Let Pages create the required DNS records. Do not manually point these names to Azure afterward.

Repeat the Phase 3 smoke tests on the production hostnames. Also verify that unauthorized cross-tenant access remains denied.

If Phase 4C is owner-deferred, validate only static delivery, TLS, SPA routing, and response headers. Record login, token refresh, authorization, cross-tenant isolation, upload/download, and other API-backed checks as pending—not passing.

Static cutover evidence recorded on 2026-10-16:

- Cloudflare authoritative DNS, `1.1.1.1`, and `8.8.8.8` resolve `app`, `admin`, and `pos` to their respective `vexorionerp-*.pages.dev` projects.
- All three production hostnames returned HTTP 200 over TLS from Cloudflare with `nosniff`, frame protection, referrer policy, and permissions policy headers.
- A local resolver still temporarily returned the former Azure CNAMEs for `app` and `admin`; this is resolver-cache propagation and does not change the authoritative result.
- API-backed login, token refresh, authorization, tenant-isolation, upload/download, and workflow checks remain pending under the Phase 4C owner deferral.

## Phase 6 — Landing page and apex domain

The dedicated landing page is implemented in `VexorionERP.LandingPage`. It is part of the npm/Turbo affected graph, has local build/lint/unit-test coverage, and uses this absolute URL for every login action:

```text
https://app.vexorionerp.com/login
```

Deployment is independently gated so this implementation cannot target a missing Pages project. Complete these steps only after `app.vexorionerp.com` resolves consistently through Cloudflare:

1. In **Workers & Pages**, create a Direct Upload Pages project named exactly `vexorionerp-landing`. A temporary static placeholder is sufficient.
2. In GitHub **Settings → Secrets and variables → Actions → Variables**, add `CLOUDFLARE_LANDING_DEPLOY_ENABLED` with value `true`.
3. Run the **Frontend** workflow manually with **deploy_all** enabled. Confirm **Deploy to Cloudflare Pages (Landing page)** passes and creates a production deployment.
4. Validate `https://vexorionerp-landing.pages.dev` at desktop and mobile widths. Confirm navigation, all sections, the login links, response headers, and browser console are healthy.
5. In the landing Pages project, add `vexorionerp.com` as a custom domain and allow Pages to replace the existing apex Website Builder records. Do not delete the GoDaddy account or domain registration.
6. Add `www.vexorionerp.com` to the landing project, or configure a Cloudflare permanent redirect from `www` to `https://vexorionerp.com` that preserves path and query string. Keep only one canonical public hostname.
7. Verify apex and `www` TLS, the permanent `www` redirect, the login handoff to `https://app.vexorionerp.com/login`, security headers, and mobile/desktop rendering.

Do not change the apex or `www` records before step 4 passes. This phase remains deliberately separate from migrating the authenticated applications.

## Phase 7 — Azure retirement

Owner-directed early retirement began on 2026-10-16. The owner accepted shortening the recommended seven-day rollback window after the Cloudflare static endpoints and canonical-domain redirect were verified. This does not convert pending API-backed validation into passing evidence.

Completed repository action:

- [x] Remove the three Azure Static Web Apps deployment jobs from `.github/workflows/frontend.yml`; future frontend deployments target Cloudflare only.
- [x] Preserve the former Azure resource hostnames in repository history and the DNS baseline above.

Owner actions still required before marking retirement complete:

1. Let the updated Frontend workflow pass and confirm all four Cloudflare deployment jobs succeed.
2. In Azure, identify the resources by **resource type** `Static Web App` and confirm their default hostnames are exactly:
   - Main UI: `proud-plant-059c31a00.7.azurestaticapps.net`
   - Admin UI: `ambitious-bay-0a07d0f00.7.azurestaticapps.net`
   - POS UI: `ashy-stone-0c83b9c00.7.azurestaticapps.net`
3. Before deletion, confirm none of those three resources contains a needed custom domain, deployment token, linked monitoring dependency, or shared resource required outside the frontend.
4. Delete only those three **Static Web App** resources. Do not delete their resource group unless every other resource in it has been independently inventoried.
5. Remove the three obsolete GitHub secrets: `AZURE_STATIC_WEB_APPS_API_TOKEN_UI`, `AZURE_STATIC_WEB_APPS_API_TOKEN_ADMIN`, and `AZURE_STATIC_WEB_APPS_API_TOKEN_POS`.
6. Never remove Azure App Service, PostgreSQL, Blob Storage, `api.vexorionerp.com`, or `asuid.api` as part of this frontend retirement.
7. Restore the API separately and complete the deferred API-backed smoke tests before marking the overall migration complete.

## Rollback

After Azure Static Web Apps resource deletion, rollback is limited to Cloudflare Pages deployment rollback or redeploying a last-known-good commit. Recreating Azure hosting would be a new deployment rather than an immediate DNS rollback. Keep the former Azure resource details above in history until migration closeout is complete.
