# Document Retention and Upload Recovery

Policy approved by the owner on 26 October 2026.

## Retention Policy

- Keep every version until an authorized explicit document or parent-project deletion. No automatic age-based purge, minimum retention duration, legal hold, or automatic history pruning is introduced.
- Archived documents remain readable under existing permissions, including preview/download and version history. Metadata changes and new versions return HTTP 409 with `document.archived_read_only`.
- Existing document-manage and project-manage authorization governs explicit deletion. Archiving is not deletion and does not release quota.
- All retained versions consume storage. Full deletion removes distinct stored objects and releases the charge to each tenant that uploaded a version, rather than charging/releasing only the current pointer or the owner.
- Parent project deletion uses the same document cleanup path. No background retention scheduler is added.

Do not configure bucket expiry rules that delete retained document/version objects independently of the application. Production bucket lifecycle settings and backup retention must be reviewed separately; this code does not enforce legal or regulatory retention obligations.

## Unknown Upload Outcomes

The server does not implement an upload idempotency key. A lost response or a server error after metadata commit can mean that a document/version already exists. Do not automatically replay the request.

Before initial or version upload, Main UI records a tenant-scoped pending marker in session storage containing only project/document IDs, not file bytes, names, notes, credentials, or signed URLs. Confirmed success or a confirmed client/quota rejection clears the marker. Network failures, request timeout/cancellation responses, and other server failures retain it. The marker survives reloads and is shared by Document Center and project Documents in the same browser tab/session.

While an attempt is pending, further document/version uploads are blocked. The UI closes the failed upload dialog so recovery controls remain reachable. Review the project document list and version history, then Refresh. Discard pending attempt becomes available only after successful server refresh and requires explicit confirmation warning that starting again can create a duplicate. Discard does not undo an upload or delete a server record.

This is conservative reconciliation guidance, not a server-side deduplication guarantee. A request can still finish after an early refresh. A new browser/tab/device or cleared browser storage does not carry the same marker. Verify authoritative server history before any new attempt; do not infer that absence during an in-flight request proves failure.

## Operator Procedure: Unconfirmed Upload

1. Do not instruct the user to retry immediately. Keep the original request time and trace ID if available; never include file contents, credentials, or signed URLs in support logs.
2. Inspect the owned project's document list and the intended document's versions. Check title, filename, size, timestamps, and stored checksum as available. Other users may upload concurrently; matching names alone are not proof of identity.
3. If the record exists, use it and do not upload the file again. Refresh the UI, then explicitly discard the client pending attempt after reviewing the warning.
4. If the record is absent, check whether the original server operation is still active or failed after a storage/database step. Wait for resolution through operational monitoring rather than issuing another mutation blindly.
5. Only after investigation should the user explicitly discard the attempt and select a file for a new upload. If duplicate records already exist, resolve them through authorized explicit deletion, not by deleting bucket objects manually.

## Operator Procedure: Partial Deletion

Storage and database changes cannot share a transaction. The application removes stored objects first, using idempotent storage deletion. If any storage removal fails, it returns `document.delete_incomplete`; metadata and quota release are not committed by that attempt, but earlier files may already be gone.

1. Do not claim the document is fully retained or fully deleted after this error. Some version bytes may be unavailable while metadata remains.
2. Restore storage connectivity/permissions and retry the same authorized deletion. Already removed objects must be treated as successful idempotent deletes.
3. After all storage removals succeed, document/version rows and storage accounting are committed together on relational databases. Per-tenant negative ledger entries do not reference a deleted document row.
4. If database/accounting commit fails after objects were removed, retain identifiers and investigate before retrying. Do not manually decrement usage or recreate version rows without reconciling the existing ledger.
5. A parent-project delete can complete individual document deletions before encountering a later failure. Keep the project until remaining cleanup succeeds and verify quota and audit history after retry.

This workflow is not a distributed transaction or a durable background deletion queue. Simultaneous upload/archive/delete races, production backup recovery, and regulatory/legal-hold policy require separate release review.

## Verification

- Backend tests cover archived mutation rejection before upload, retained history, distinct object cleanup, collaborator charge release, foreign-owner protection, storage failure, and shared parent-project cleanup.
- Frontend tests cover pending persistence/remount, tenant separation, known versus unknown failures, refresh failure, explicit discard confirmation, and archived controls.
- The local API/R2 Playwright lifecycle drops a committed v2 response, reloads with the marker present, reconciles without v3, verifies unchanged v1 and exact v2 bytes, archives the file, and confirms explicit deletion restores numeric storage usage to the original baseline.
- No database migration, automatic expiry, or production deployment is included. Malware scanning remains removed and deferred to the final project step; see [CLAMAV_COST_ANALYSIS.md](CLAMAV_COST_ANALYSIS.md).