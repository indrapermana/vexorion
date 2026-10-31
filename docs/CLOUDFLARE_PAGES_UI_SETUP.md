# Cloudflare Pages Setup for the Three VexorionERP UIs

This runbook deploys the authenticated Main UI, Admin UI, and POS application to Cloudflare Pages through the repository's GitHub Actions workflow.

The public landing page is intentionally outside this guide.

## Resulting projects

| Application | Source directory | Pages project | Custom domain |
|---|---|---|---|
| Main UI | `VexorionERP.UI` | `vexorionerp-app` | `app.vexorionerp.com` |
| Admin UI | `VexorionERP.AdminUI` | `vexorionerp-admin` | `admin.vexorionerp.com` |
| POS | `VexorionERP.POS` | `vexorionerp-pos` | `pos.vexorionerp.com` |

All production deployments use branch `master` and the direct-upload Pages workflow in `.github/workflows/frontend.yml`.

## 1. Place DNS under Cloudflare

1. Add `vexorionerp.com` as a Cloudflare zone using **Full DNS Setup**.
2. Import the existing records automatically.
3. Compare every imported record with the current registrar records, especially API, mail, verification, DMARC, and Azure rollback records.
4. At the registrar, replace the existing authoritative nameservers with the two Cloudflare nameservers.
5. Wait until Cloudflare reports the zone as active.

Do not delete the registrar account; the domain remains registered there. Only authoritative DNS moves to Cloudflare.

## 2. Create the three Pages projects

In **Workers & Pages**, create these Pages projects:

- `vexorionerp-app`
- `vexorionerp-admin`
- `vexorionerp-pos`

Use the Pages/direct-upload flow. If the dashboard initially shows the combined Worker creation screen, select **Continue to Pages**, then choose the upload/direct-deploy route. The repository workflow will supply later builds, so no independent Cloudflare Git build configuration is required.

## 3. Create a Cloudflare deployment token

Create an API token with the minimum Pages permissions needed to read and deploy these projects. Save the token once. Also copy the Cloudflare Account ID from the account overview or Pages API information.

Do not confuse these values:

- `CLOUDFLARE_API_TOKEN` is a secret created by you.
- `CLOUDFLARE_ACCOUNT_ID` is the Cloudflare account identifier.
- `GITHUB_TOKEN` is automatically created by GitHub Actions for each workflow run; it is not manually generated or stored.

## 4. Configure GitHub

Set the repository secret:

```text
FRONTEND_PROD_API_BASE_URL=https://<cloud-run-service-host>/api
```

It must include `/api` and must not have a trailing slash. It is a repository secret because the build job runs before environment-scoped deployment jobs.

In the GitHub `production` environment, add:

```text
CLOUDFLARE_API_TOKEN=<pages-deployment-token>
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
```

Add the environment variable:

```text
CLOUDFLARE_PAGES_DEPLOY_ENABLED=true
```

Restrict the production environment to the `master` branch.

## 5. Understand the build and deploy workflow

The workflow uses Node.js 22 and runs from the monorepo root:

```bash
npm ci --include=optional
npx turbo run build --filter=...[HEAD^1]
npx turbo run typecheck --filter=...[HEAD^1]
npx turbo run lint --filter=...[HEAD^1]
```

Affected-package detection means an app-only change deploys that app, while a shared package or lockfile change rebuilds all consumers. Each Pages job patches the project's production branch to `master`, then deploys the relevant `dist` directory with Wrangler.

To force all applications to rebuild—for example after changing the production API URL—run the **Frontend** workflow manually and set `deploy_all` to `true`.

## 6. Attach custom domains

For each Pages project, open **Custom domains** and add its matching domain:

1. `vexorionerp-app` -> `app.vexorionerp.com`
2. `vexorionerp-admin` -> `admin.vexorionerp.com`
3. `vexorionerp-pos` -> `pos.vexorionerp.com`

Because the zone is already on Cloudflare, Pages should create or update the proxied DNS record automatically. Each domain must show **Active** before validation.

Expected DNS targets are the matching `*.pages.dev` projects, with Cloudflare proxying enabled. Remove obsolete Azure Static Web Apps CNAMEs only after the Pages custom domain is active and tested.

## 7. Trigger the first production deployment

Either push an approved frontend change to `master`, or run the workflow manually with `deploy_all=true`. In GitHub Actions, confirm:

1. Build, type check, lint, and unit tests pass.
2. Each selected Pages deployment job succeeds.
3. Cloudflare labels the `master` deployment as **Production**, not Preview.

A deployment from another branch is expected to be a Preview deployment. If `master` appears as Preview, confirm the Pages production branch is `master`; the workflow also patches this setting before each deploy.

## 8. Validate each application

Open a private/incognito browser window to avoid stale tokens and service-worker/cache state, then test:

- `https://app.vexorionerp.com`
- `https://admin.vexorionerp.com`
- `https://pos.vexorionerp.com`

For each application:

1. Confirm HTTPS is valid.
2. Confirm the app shell and static assets load.
3. Log in with an authorized test account.
4. Confirm authenticated API calls use the production Cloud Run host.
5. Confirm there are no browser CORS errors.
6. Confirm refresh/deep-link behavior works on a client-side route.

Clearing browser history is not normally needed for DNS changes. Use an incognito window, `dig`, or `nslookup` to distinguish local cache from DNS or origin configuration.

## 9. Troubleshooting

### Azure 404 appears

DNS still points to the former Azure Static Web Apps hostname, or a resolver has cached the old answer. Confirm the Cloudflare DNS record targets the Pages project and the Pages custom domain is active. Do not delete an Azure resource as a cache-clearing technique.

### Cloudflare 522 appears

The proxied record is pointing at an unreachable origin rather than Pages. Attach the hostname through the Pages project's **Custom domains** screen so Cloudflare creates the correct route.

### HTTPS certificate problem

Wait until the Pages custom domain reports Active, confirm the DNS record is proxied, and check that no duplicate record exists. Certificate issuance follows successful domain validation and can take time.

### Build succeeds but the wrong API is used

Correct `FRONTEND_PROD_API_BASE_URL`, then manually run the workflow with `deploy_all=true`. Vite embeds the API base URL at build time; changing the secret alone does not modify an existing deployment.

## Operational checklist

- [ ] Cloudflare is authoritative for `vexorionerp.com`.
- [ ] All three Pages projects exist.
- [ ] Production branch is `master`.
- [ ] GitHub token and account ID are configured in the production environment.
- [ ] Production API base URL includes `/api` and no trailing slash.
- [ ] All three custom domains are Active with valid HTTPS.
- [ ] Login and authenticated API calls work in all three apps.
- [ ] No CORS errors occur.
- [x] Obsolete Azure UI resources and credentials were retired after validation (owner-confirmed 31 October 2026).

