# Import and generated-document operations

This runbook describes the current production behavior for import submissions and generated documents. It is an operator procedure, not a claim that PostgreSQL and R2 participate in one distributed transaction.

## Retention policy

### Import jobs

- Import-job metadata, status, error summary, and validated row JSON are retained in PostgreSQL. There is currently no scheduled purge.
- A successfully submitted job cannot be submitted again. The API returns `409 Conflict`; inspect the existing job status instead of creating a blind retry.
- A failed submission is terminal. Correct the source data, validate a new job, and submit that new job.
- Import history is tenant-scoped. Never inspect or alter a job without confirming its tenant ID.

### Generated documents

- Every successfully persisted version is retained. Regeneration marks the previous ready version `Superseded`; it does not delete its metadata or R2 object.
- Historical ready/superseded versions remain available for preview and download.
- Tenant deletion removes the tenant's generated-document objects before relational tenant deletion. A storage failure blocks tenant deletion so the operator can retry safely.
- There is no age-based expiry, legal-hold workflow, or scheduled purge. Do not manually remove an R2 object while its `GeneratedDocument` row exists.

## Import submission guarantees

Submission claims the validated job and executes its business-record writes inside one database transaction.

- Concurrent requests for the same job cannot execute the importer twice. One request owns the claim; later requests return `409 Conflict`.
- Executor errors or exceptions roll back all business-record writes from that job and record the terminal job as `ImportFailed`.
- A cancelled server execution is rolled back and recorded as failed before cancellation is propagated.
- Different validated jobs are independent. Database uniqueness constraints remain the final protection when different jobs target the same business key.

## Recover an uncertain import response

Use this procedure when the browser, proxy, or client loses the submit response:

1. Do not upload or submit another copy immediately.
2. In the UI, use the import recovery prompt to refresh the original job. Alternatively, query `GET /api/imports/{importJobId}` with the affected tenant context.
3. Interpret the status:
   - `Imported`: the transaction committed; verify the target records and do not retry.
   - `ImportFailed`: the business-record transaction rolled back; review `errorSummary`, correct the workbook, and create a new validation job.
   - `Validated` with no submission timestamp: no submission owns the job; it may be reviewed and submitted.
   - A submission timestamp without a terminal status should be treated as an interrupted/unknown operation. Preserve the job ID and application logs for investigation; do not bypass it with a database edit.
4. Correlate the job ID with the `imports.validation.completed` and `imports.submitted` audit events.

## Recover a generated-document failure

R2 upload happens before generated-document metadata is saved. If the database save fails, the application performs a compensating delete of the newly uploaded object.

1. Refresh document history before generating again. A lost response may still represent a completed version.
2. If history contains the new ready version, the operation completed. Do not regenerate solely because the original response was lost.
3. If the API reports that metadata could not be saved and the uploaded object was removed, no operator cleanup is required; retry generation after resolving the database failure.
4. If the API reports that the uploaded object could not be removed:
   - capture the request time, tenant, source type, source entity ID, and application logs;
   - inspect the tenant/source prefix in the private R2 documents bucket;
   - compare candidate objects with `GeneratedDocument.BlobPath` values for that tenant;
   - delete only an object that has no matching metadata row and belongs to the failed request;
   - refresh history before retrying generation.
5. Never delete superseded objects merely because they are not the current version; superseded versions are retained intentionally.

## Verification queries

Run these with the migration/operator connection, using explicit tenant and job identifiers. Do not put credentials in command history or this document.

```sql
SELECT "Id", "TenantId", "ImportType", "Status",
       "ValidatedAtUtc", "SubmittedAtUtc", "CompletedAtUtc", "ErrorSummary"
FROM "ImportJob"
WHERE "TenantId" = '<tenant-id>'
  AND "Id" = '<import-job-id>';
```

```sql
SELECT "Id", "TenantId", "SourceType", "SourceEntityId", "Format",
       "Status", "Version", "BlobPath", "GeneratedAtUtc"
FROM "GeneratedDocument"
WHERE "TenantId" = '<tenant-id>'
  AND "SourceEntityId" = '<source-entity-id>'
ORDER BY "Version" DESC;
```

Expected generated-document state is one current `Ready` version per source/format and zero or more retained `Superseded` versions. A failed operation with no metadata row should also have no R2 object after successful compensation.

## Escalation boundaries

- Do not reset `SubmittedAtUtc`, change terminal import status, or manually replay validated JSON in production.
- Do not delete import history or generated-document metadata as incident cleanup without a separately reviewed retention/deletion operation.
- Do not claim rollback across PostgreSQL and R2. Generated-document cleanup is compensating behavior and can require the manual reconciliation procedure above.
- Preserve relevant Cloud Run and Loki logs before changing data or storage.
