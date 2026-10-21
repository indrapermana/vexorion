# Google Cloud Run Production Setup

This runbook provisions the production GCP project and deploys the .NET 10 VexorionERP API to Cloud Run using GitHub Actions and keyless Workload Identity Federation.

## Resulting resources

| Resource | Value |
|---|---|
| Project | `vexorionerp-production` |
| Region | `asia-southeast2` |
| Artifact Registry repository | `vexorionerp-api` |
| Image package | `api` |
| Cloud Run service | `vexorionerp-api-production` |
| Runtime service account | `vexorionerp-api-production@vexorionerp-production.iam.gserviceaccount.com` |
| GitHub deployer | `vexorionerp-github-production@vexorionerp-production.iam.gserviceaccount.com` |

## 1. Create and select the project

Authenticate, create a named configuration, and select the project:

```bash
gcloud auth login
gcloud config configurations create vexorionerp-production
gcloud config set account <gcp-account-email>
gcloud config set project vexorionerp-production
gcloud config set run/region asia-southeast2
```

Create the project in the Google Cloud console or CLI, attach the correct billing account, and apply descriptive labels such as `application=vexorionerp`, `environment=production`, and `managed-by=github-actions`.

Verify:

```bash
gcloud projects describe vexorionerp-production \
  --format='yaml(projectId,name,projectNumber,lifecycleState,labels)'
gcloud config list
```

## 2. Enable only the required APIs

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
  --project=vexorionerp-production
```

## 3. Create Artifact Registry

```bash
gcloud artifacts repositories create vexorionerp-api \
  --project=vexorionerp-production \
  --location=asia-southeast2 \
  --repository-format=docker \
  --description='VexorionERP API images'
```

Configure a cleanup policy that deletes untagged/old versions after 30 days while retaining the latest 10 versions. Start with `cleanupPolicyDryRun: true`, inspect the candidates, and only then enable enforcement.

## 4. Create service accounts

```bash
gcloud iam service-accounts create vexorionerp-api-production \
  --project=vexorionerp-production \
  --display-name='VexorionERP production runtime'

gcloud iam service-accounts create vexorionerp-github-production \
  --project=vexorionerp-production \
  --display-name='VexorionERP GitHub production deployer'
```

The runtime identity reads only its required secrets. The deployer may update Cloud Run, push to the production repository, and act as the runtime identity. Do not create user-managed service-account keys.

## 5. Create production secrets

Create these Secret Manager resources:

| Secret | Cloud Run setting |
|---|---|
| `vexorionerp-production-db-connection` | `ConnectionStrings__DefaultConnection` |
| `vexorionerp-production-jwt-secret` | `Jwt__SecretKey` |
| `vexorionerp-production-r2-access-key-id` | `Storage__R2__AccessKeyId` |
| `vexorionerp-production-r2-secret-access-key` | `Storage__R2__SecretAccessKey` |
| `vexorionerp-production-grafana-loki-api-key` | `GrafanaLoki__ApiKey` |

Create each resource, then add its value without putting the value in the command line:

```bash
gcloud secrets create <secret-name> \
  --project=vexorionerp-production \
  --replication-policy=automatic

gcloud secrets versions add <secret-name> \
  --project=vexorionerp-production \
  --data-file=-
```

Type or pipe the value from a protected local source, then press Ctrl-D. Grant `roles/secretmanager.secretAccessor` to the runtime service account on each secret resource, not at project scope.

Map an explicit tested version such as `1`, rather than `latest`, so secret rotation is a controlled revision change.

## 6. Configure the Cloud Run service

Deploy an initial image, then configure these limits:

- 1 vCPU and 512 MiB memory.
- Minimum instances: 0.
- Maximum instances: 1.
- Concurrency: 80.
- Request timeout: 300 seconds.
- Request CPU throttling enabled.
- Runtime identity: `vexorionerp-api-production@vexorionerp-production.iam.gserviceaccount.com`.
- Public invocation enabled with `--no-invoker-iam-check`; application endpoints remain protected by VexorionERP authentication and authorization.

Set non-secret environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
Storage__Provider=R2
Storage__R2__AccountId=<cloudflare-account-id>
Storage__R2__DocumentBucketName=vexorionerp-documents
Storage__R2__ProductImageBucketName=vexorionerp-product-images
Storage__R2__ProductImagePublicBaseUrl=https://images.vexorionerp.com
Storage__R2__SignedUrlLifetimeMinutes=5
Security__UseHttpsRedirection=false
Logging__File__Enabled=false
DocumentSecurity__RequireMalwareScan=false
DocumentSecurity__ClamAv__Enabled=false
GrafanaLoki__Url=<grafana-loki-url>
GrafanaLoki__User=<grafana-loki-user>
```

HTTPS redirection is disabled inside the container because Cloud Run terminates TLS. Malware scanning remains explicitly disabled until a private scanner is deployed and validated.

Map the five Secret Manager values from the previous step to their corresponding settings.

## 7. Configure Workload Identity Federation

Create a workload identity pool named `github-actions` and an OIDC provider named `vexorionerp-master`. Trust GitHub's issuer `https://token.actions.githubusercontent.com` and map the required claims.

Restrict the provider/ IAM condition to all of the following:

- Repository: `indrapermana/vexorion`.
- Repository owner: the expected GitHub owner.
- Branch: `refs/heads/master`.
- Workflow: `.github/workflows/backend.yml`.

Allow only the matching principal set to impersonate `vexorionerp-github-production`. This is the trust boundary that replaces a downloaded Google service-account key.

## 8. Grant deployment permissions

Grant the deployer only the permissions needed to:

- Push images to `vexorionerp-api`.
- Update `vexorionerp-api-production`.
- Act as the production runtime service account.

It must not read application secrets. Keep Artifact Registry permissions scoped to the repository when possible.

## 9. Configure the GitHub production environment

Create a GitHub environment named `production`, restrict it to the `master` branch, and add these environment variables:

```text
GCP_PROJECT_ID=vexorionerp-production
GCP_REGION=asia-southeast2
GCP_ARTIFACT_REPOSITORY=vexorionerp-api
GCP_CLOUD_RUN_SERVICE=vexorionerp-api-production
GCP_IMAGE_NAME=api
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/<project-number>/locations/global/workloadIdentityPools/github-actions/providers/vexorionerp-master
GCP_DEPLOY_SERVICE_ACCOUNT=vexorionerp-github-production@vexorionerp-production.iam.gserviceaccount.com
```

Add `SIXLABORS_LICENSE_FILE` as an environment secret containing the full license-file content. Keep `SIXLABORS_LICENSE_KEY` as the repository secret required by build/test. Runtime secrets remain in Google Secret Manager and must not be duplicated in GitHub.

## 10. Deploy through GitHub Actions

Push an approved commit to `master`. `.github/workflows/backend.yml` will:

1. Build and test the backend.
2. Exchange the GitHub OIDC token for short-lived Google credentials.
3. Build the .NET 10 container with the Six Labors license as a BuildKit secret.
4. Push the SHA-tagged image to Artifact Registry.
5. Resolve its immutable digest.
6. Update Cloud Run to that digest.
7. Verify `/health/live` and `/health/ready`.

## 11. Verify production

```bash
gcloud run services describe vexorionerp-api-production \
  --project=vexorionerp-production \
  --region=asia-southeast2 \
  --format='yaml(status.url,status.latestCreatedRevisionName,status.latestReadyRevisionName,status.traffic)'

gcloud run revisions list \
  --project=vexorionerp-production \
  --region=asia-southeast2 \
  --service=vexorionerp-api-production \
  --sort-by='~metadata.creationTimestamp' \
  --limit=5
```

Then verify the returned service URL:

```bash
curl --fail --show-error https://<service-host>/health/live
curl --fail --show-error https://<service-host>/health/ready
```

Both must return `Healthy`. Also verify login, an authenticated request, R2 upload/download/delete, exact CORS behavior for the three UI origins, Cloud Logging, and Grafana Loki ingestion.

## 12. Roll back and roll forward

Cloud Run retains revisions. Move 100% traffic to the previously verified revision, repeat health checks, then move traffic back to the current revision. A rollback changes application code only; it must continue using the same production Neon database and R2 buckets.

## Operational checklist

- [ ] Project and billing are correct.
- [ ] Required APIs only are enabled.
- [ ] Artifact cleanup policy was tested in dry-run mode.
- [ ] Runtime and deployer use separate service accounts.
- [ ] No service-account key exists.
- [ ] Runtime secret access is resource-scoped.
- [ ] GitHub OIDC trust is repository, branch, owner, and workflow restricted.
- [ ] Cloud Run is min 0, max 1, and health checks pass.
- [ ] Runtime secrets exist only in Secret Manager.
- [ ] Rollback and roll-forward have been tested.

