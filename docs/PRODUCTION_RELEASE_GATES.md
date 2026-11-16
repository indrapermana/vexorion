# Production Release Gates

Last reviewed: 16 November 2026

These gates validate the existing single production environment. They do not create a staging project, database, Cloud Run service, or additional paid resource.

## Automatic deployment gate

Every eligible `master` backend deployment runs `.github/workflows/backend.yml` in this order:

1. Build and test the backend.
2. Build and push one immutable container digest.
3. Record the currently ready Cloud Run revision.
4. Deploy and execute the restricted migration job with that digest.
5. Stop before changing API traffic if migration fails.
6. Deploy the same digest to the API service.
7. Require the latest-created revision to be the latest-ready revision, use the expected digest, and receive 100% traffic.
8. Verify TLS and response status for the landing page, Main UI, Admin UI, POS, `/health/live`, `/health/ready`, and the anonymous authentication boundary.
9. Require both health endpoints to return exactly `Healthy` and readiness to respond within the configured threshold.
10. Verify exact CORS preflight behavior for the three approved UI origins and denial for an unapproved origin.
11. Upload the migration execution, commit, workflow URL, prior/current revisions, digest, endpoint timings, TLS results, and CORS results as `production-release-evidence-<commit>`.

The evidence artifact is retained for 90 days. It contains no database connection, JWT key, R2 credential, email key, or other secret.

## Read-only idle/readiness check

Use **Actions → Production readiness check → Run workflow** only after the min-zero service has been left unused for the approved idle window.

1. Confirm `idle_window_confirmed`.
2. Set the accepted health-response threshold; the default is 30 seconds.
3. Run the workflow.
4. Download `production-readiness-evidence-<run-id>`.

The workflow refuses to claim cold-start evidence when Cloud Run reports a non-zero minimum instance count. It does not force-stop an instance. The operator confirmation establishes that the approved idle window elapsed; Cloud Run still controls whether an instance was actually reclaimed. Complete OPS-002 acceptance also requires a production-safe authenticated read/write smoke flow and confirmation that startup did not migrate or bootstrap data.

## Controlled rollback and restore rehearsal

The rollback workflow changes production traffic and therefore uses the protected `production` GitHub environment. Run it only in an approved window with two known-good, schema-compatible revisions.

1. List revisions and identify the previous known-good revision and the current revision:

   ```bash
   gcloud run revisions list \
     --project=vexorionerp-production \
     --region=asia-southeast2 \
     --service=vexorionerp-api-production \
     --sort-by='~metadata.creationTimestamp' \
     --limit=5
   ```

2. Open **Actions → Production rollback rehearsal → Run workflow**.
3. Enter the previous revision as `rollback_revision`.
4. Enter the current revision as `restore_revision`. The workflow requires it to currently receive 100% traffic.
5. Enter `ROLLBACK_AND_RESTORE_PRODUCTION` exactly.
6. Approve the protected production environment when prompted.

The workflow verifies that both revisions belong to the production service and are Ready, shifts 100% traffic to the previous revision, runs the production verification gate, restores 100% traffic to the current revision, and runs the gate again. An exit trap attempts restoration if a rollback verification command fails. Download `production-rollback-evidence-<run-id>` and confirm the workflow completed successfully before closing the rehearsal.

Do not use a revision that is incompatible with the current Neon schema. Database rollback is not part of this procedure.

## Release sign-off

The automated artifacts supply technical evidence, not Product or QA approval. For a release candidate, retain:

- the backend and frontend workflow URLs for the selected commit;
- backend test/coverage artifacts;
- the production release evidence artifact;
- applicable Playwright and manual regression evidence;
- the rollback rehearsal artifact when required by the release window;
- unresolved P0/P1 defects and accepted risks;
- recorded QA, Product, and Engineering approval.

OPS-007 is complete only when all mandatory evidence points to the same approved commit/revision and the human sign-off is recorded.

## Local contract test

The production verifier has a network-free contract test:

```bash
scripts/release/test-verify-production.sh
```

This validates success-path parsing, exact health bodies, TLS fields, CORS decisions, JSON output, and Markdown evidence generation. It does not contact production.
