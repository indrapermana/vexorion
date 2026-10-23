# VexorionERP Consolidated Review and Development Plan

Last reviewed: 21 October 2026
Review basis: repository documentation, backend/domain/database/service/handler/controller code, the three frontend applications, automated tests, build configuration, and local validation described below.

This is the single source of truth for implementation status and upcoming development work. A checked item means the capability is present in the current repository; it does not by itself mean production readiness. Release readiness requires the quality gates in this document to pass.

## 1. Executive assessment

VexorionERP has broad functional coverage: core ERP workflows, POS, finance, imports, generated documents, project/document management, tenant collaboration, module controls, and storage governance are all represented in code. The frontend production build succeeds and the service test project is healthy.

The project is **not release-ready**. P0-1 through P0-4 established a trustworthy validation baseline, P1-1 substantially hardened project/document workflows, the backend now targets .NET 10, and state-changing database/bootstrap work has been removed from normal API startup. Remaining readiness gaps are provider migration, evidence, and operational hardening:

1. Playwright jobs are defined but hard-disabled in CI, so there is no current E2E release evidence.
2. Clean installation, least-privilege runtime access, idempotent bootstrap, authentication, credential rotation, and point-in-time restore were integration-validated using separate Neon rehearsal and production databases. The owner selected one persistent production environment for the early pilot; the GitHub environment and Neon project used for staging are deleted, and the GCP staging project is in its provider deletion window. A production-like upgrade rehearsal has not been recorded.
3. Cloudflare R2 upload, delivery, deletion, and signed-URL expiry are integration-validated against the configured real buckets. Backup/restore, rollback, monitoring, performance, accessibility, and penetration checks remain unvalidated.
4. Several critical workflows still need the P1/P2 tests and semantic reconciliation listed below.
5. No single release-candidate commit has passed backend, frontend, E2E, migration, storage, and smoke gates together.

The active execution track is now **feature completion and UI/UX hardening**. The low-cost production architecture is operational, while `MIG-M06` backup/disaster-recovery work is deliberately parked until the unfinished product workflows and usability backlog below are resolved. No review finding is authorization to change production behavior: each unchecked item must be implemented, tested, and accepted separately.

## 2. Review method and confidence

### Inspected

- Root README and all former milestone, roadmap, migration, project/document, deployment, and phase plans.
- Domain models, EF Core configuration/migrations, contracts, services, handlers, controllers, permissions, middleware, and dependency registration.
- Main UI, AdminUI, POS routes, API clients, error handling, feature pages, and test suites.
- CI/workspace scripts and recent repository history.

### Evidence states

| State | Meaning |
|---|---|
| Implemented | Present in the repository; no validation claim is implied. |
| Locally validated | Relevant automated checks passed on the recorded local source state. |
| Integration validated | Required external services or cross-component workflow passed with recorded environment evidence. |
| Release validated | The same immutable commit passed every applicable release gate and produced traceable artifacts. |

Percentage-complete labels are intentionally not used. Capability-inventory checkboxes below mean **implemented** only unless a stronger state and evidence are explicitly recorded.

### Current validation evidence — 21 October 2026

| Check | Result | Evidence / implication |
|---|---|---|
| Source state | PRODUCTION CI PASS; UX-FND-01/12 + E2E-FND-01 FOUNDATION WORKTREE | The committed production workflow passed its build/test, OIDC, immutable-image deployment, and live/ready gates. The current worktree hardens module routing, standardizes local frontend API proxies, and adds the guarded isolated-tenant E2E lifecycle foundation; it is locally validated but not yet committed or CI-validated. |
| Environment | RECORDED | macOS 26.7.1, .NET SDK 10.0.301 targeting .NET 10, Node 22.22.0, npm 10.9.4. |
| `dotnet build VexorionERP.sln --configuration Release --no-restore --disable-build-servers --verbosity minimal -m:1 -p:UseSharedCompilation=false` | PASS | Zero warnings and zero errors on all nine `net10.0` projects. |
| `dotnet test VexorionERP.sln --no-restore --disable-build-servers --verbosity minimal -m:1 -p:UseSharedCompilation=false` | PASS | 887/887: Services 529, Web 203, Handlers 155. Includes tenant-level R2 cleanup and storage-backed deletion regression coverage. |
| `dotnet package list --project VexorionERP.sln --vulnerable --include-transitive --no-restore` | PASS | NuGet reported no vulnerable direct or transitive packages in all nine projects, including AWSSDK.S3 4.0.104.5. |
| `npm run test:run` | PASS | 195/195 frontend tests: Main UI 94, AdminUI 30, POS 71, plus 7/7 isolated E2E tenant-lifecycle tests. The command also validates the local API routing contract for all three applications before running unit tests. |
| `npm run build` | PASS WITH WARNING | All four frontend packages built; Main UI emitted the known chunk-size warning. |
| EF migration model state | PASS | `dotnet ef migrations has-pending-model-changes` reports no model change since the last migration; existing migrations were preserved. All five migrations were applied independently to empty Neon staging and production databases. A production-like upgrade rehearsal remains unvalidated. |
| Cloudflare frontend to production API | OWNER CONFIRMED | Exact production CORS checks passed and login succeeds on Main UI, Admin UI, and POS after all three were rebuilt against the production Cloud Run `/api` URL. This confirms deployed authentication routing, not full workflow or release validation. |
| Cloudflare R2 integration | OWNER CONFIRMED | Product-image delivery, private-document upload/preview/download, product/document/project deletion cleanup, and signed-URL expiry work against the configured real buckets. |
| Neon staging integration | OWNER CONFIRMED | Direct migration and least-privilege pooled runtime roles work; `pg_trgm` and all five migrations are present; bootstrap is idempotent; normal API startup and UI login succeed; and isolated point-in-time recovery restored a deleted marker with application records intact. |
| Neon production and Cloud Run | OWNER CONFIRMED | The database has `pg_trgm` and all five migrations; least-privilege roles, idempotent bootstrap, and password rotation passed. Production CI/OIDC, live/ready, anonymous 401, authenticated admin, Loki, reversible category/project/document writes, byte-identical R2 download, object/API deletion, and rollback to the prior healthy revision and forward to the CI revision passed. Release-candidate and recovery evidence remain pending. |
| Durable artifacts | NOT RECORDED | Local terminal validation produced no durable artifact URLs. CI artifact/run links must be recorded against a release-candidate commit. |

### Still not validated

- A production-like upgrade migration rehearsal against Neon PostgreSQL; current provider metadata and temporary-branch cleanup also require operator recording.
- Cloudflare R2 upload/delivery/deletion/expiry behavior is integration-validated. Operational object-protection, credential-rotation rehearsal, and disaster-recovery evidence remain pending.
- CI Playwright execution and the remaining end-to-end workflows requiring live services and credentials.
- Independent production backup/restore, cold-start timing, performance, accessibility, or penetration testing.

Any capability requiring those checks remains **implemented** or **locally validated**, not integration- or release-validated.

## 3. Implemented capability inventory

### 3.1 Platform and architecture

- [x] ASP.NET Core 10 API with EF Core 10/PostgreSQL.
- [x] Tenant-aware domain model, query filtering, claims/policy authorization, audit infrastructure, rate limiting, HTTPS/HSTS, and CSP headers.
- [x] CQRS/Mediator handlers alongside application services.
- [x] React/Vite Main UI, AdminUI, and POS workspaces plus shared `@vexorion/ui` package.
- [x] Access-token refresh handling in all three frontend API clients.
- [x] CI definitions for backend, frontend builds/tests, and credential-gated E2E jobs.
- [x] Current frontend production build succeeds.
- [x] Normal API startup performs read-only database/schema validation; migrations and bootstrap run only through explicit `migrate`, `bootstrap`, or `provision` operations.
- [x] Local development configuration is Git-ignored with a tracked sanitized example; production configuration contains no database, JWT, bootstrap, storage, or logging secret values.
- [x] Azure and Cloudflare R2 storage adapters are provider-selectable. R2 documents use private object keys and signed reads; product images require a separate bucket and HTTPS public custom domain. Azure remains the default pending real R2 validation.
- [x] Main UI, Admin UI, POS, and the public landing page are deployed through Cloudflare Pages; owner-confirmed login smoke evidence exists for all three authenticated applications.

### 3.2 Core ERP

- [x] Tenant onboarding, users, roles, permissions, companies, menu configuration, tax/discount configuration, and numbering sequences.
- [x] Products, categories, identifiers/barcodes, warehouses, and inventory balances.
- [x] Inventory adjustments, warehouse transfers, stock counts, posting/reversal behavior, and movement records.
- [x] Sales orders and purchase orders with line management.
- [x] Partial purchase receipts and sales shipments with remaining-quantity controls and inventory posting.
- [x] Sales invoices and purchase invoices, lines, totals, payment terms, source-document creation, approval/posting support, and balance tracking.
- [x] Customer and vendor payments with allocation/over-allocation rules.
- [x] Chart of accounts, fiscal periods, journals, posting, reversal, dashboard metrics, AR/AP aging, trial balance, P&L, balance sheet, comparisons, drill-down, and CSV exports.
- [x] Audit-log browsing scaffold.

### 3.3 POS

- [x] Authentication and POS permissions.
- [x] Persistent shift open/close flow.
- [x] Product search/scanning, cart, quantity/discount controls, checkout, payment, receipt, reprint, and transaction history.
- [x] Return/refund and credit-note flow with reason capture.
- [x] Checkout stock revalidation, conflict recovery, transient retry, client logging, and telemetry.
- [x] POS runtime error boundary and session-timeout handling.

### 3.4 Import and generated business documents

- [x] Import job and generated-document persistence models/migration.
- [x] Excel template download, parsing, validation, annotated errors, submit/status/history workflow, and import UI.
- [x] Initial adapters for customer, supplier, product, sales order, and purchase order imports.
- [x] Canonical DOCX/PDF rendering and templates for initial commercial documents.
- [x] Generate, list, download-link, inline view, PDF preview, and regenerate endpoints/UI.
- [x] Separate document view/download/generate/regenerate permissions and audit hooks.
- [x] Private Azure document container configuration, tenant-scoped blob paths, and short-lived read-only SAS URLs are present in code.

### 3.5 Project, document, and tenant collaboration modules

- [x] Project categories, projects, parties, lifecycle/history, list/detail UI, and filters.
- [x] Employees, consultants, assignments, history, overlap rules, and cross-tenant relationship checks.
- [x] Project document folders, metadata, upload, versioning, workflow status, access policies, search, preview, download, and audit events.
- [x] Tenant relationships, lifecycle, scopes, validity periods, and management UI.
- [x] Tenant plans, quotas, storage ledgers/summaries, usage trends/top consumers/export, and limit-change audit.
- [x] Per-tenant module toggles, backend middleware enforcement, frontend route/navigation guards, rollout allowlists, and effective-access preview.
- [x] Startup backfill/defaults for module configuration and tenant plans.

## 4. Findings and implementation mismatches

Priority meanings: **P0** blocks trustworthy release behavior; **P1** is required for release readiness; **P2** is important follow-up; **P3** is optional product expansion.

### P0-1 — Error responses and user messages are inconsistent

**Status: implemented and validated on 13 October 2026.** The remaining P0 work starts at P0-2.

**Original finding (resolved by P0-1)**

- `ServiceResultControllerBase` returns validation problems for validation errors, `{ message }` for some 400/409 errors, and empty bodies for 401/403/404.
- Ad-hoc controllers also return plain strings, anonymous `{ message }` objects, or empty responses.
- The global exception handler returns only `{"message":"An unexpected error occurred."}` and no trace/correlation identifier.
- All three frontend API clients duplicate the same parser and inspect only a string payload or `payload.message`. They do not consistently derive a message from RFC Problem Details `detail`, `title`, or field-level `errors`.
- Many Main UI and AdminUI pages catch an error and replace it with a generic local message even when the error is an `ApiError` with a useful business cause.
- POS special-cases insufficient stock by searching English text for `"Insufficient"`, which is brittle and not suitable for localization.
- Field-validation errors are handled inconsistently and depend on exact server property casing.

**User impact**

The same business failure can appear as a precise message, `Request failed with status code 404`, “Unable to save…”, or a generic checkout error depending on the endpoint and screen. Users cannot reliably tell whether the cause is invalid input, missing data, permissions, conflict, connectivity, or a server fault.

**Required implementation**

- [x] Adopt one API error envelope based on `ProblemDetails` / `ValidationProblemDetails` for every non-2xx response.
- [x] Include stable fields: HTTP status, user-safe `title`/`detail`, machine-readable `code`, field `errors`, and `traceId`; never expose stack traces or secrets.
- [x] Map domain outcomes consistently: validation 400, authentication 401, authorization 403, missing resource 404, state/concurrency/duplicate conflict 409, throttling 429, quota 507 where retained, and unexpected fault 500.
- [x] Return meaningful, safe bodies for 401/403/404 instead of empty responses.
- [x] Move the duplicated frontend parser to shared code and parse string, `message`, `detail`, `title`, validation errors, network/offline, timeout, 429, and 5xx cases.
- [x] Give `ApiError` structured `code`, `traceId`, and normalized field errors; preserve the original technical cause for telemetry.
- [x] Replace message-text matching in POS with the machine-readable `inventory.insufficient_stock` code.
- [x] Audit error-message catch paths: show server business detail when safe, retain field errors for inputs, and use generic copy only for genuinely unknown failures.
- [x] Add actionable recovery hints for connectivity, authentication, authorization, conflicts, throttling, disabled modules, and unexpected errors; inventory conflicts include available and required quantities.
- [x] Add backend contract tests for supported status shapes and frontend parser tests proving causal detail, field errors, codes, and trace references survive normalization.

**Acceptance examples**

- Insufficient stock identifies the product/warehouse and available quantity, without relying on English substring matching.
- Duplicate email identifies the email field and explains the conflict.
- Disabled module/permission failures distinguish “module unavailable” from “you lack permission.”
- Unexpected server errors show a safe message and a trace ID that can be found in logs.

### P0-2 — Backend validation gate is red

**Status: completed and release validated on 13 October 2026.**

- [x] Fix the failing `AuthorizationBoundaryAuditTests`. The audit middleware now wraps authorization, so it observes and persists 403 policy denials that short-circuit before controllers and handlers.
- [x] Document the audit boundary: authorization policy denials must persist an `authorization.access_denied` event; audit failures are logged but must not replace or prevent the 403 response.
- [x] Fix the failing `AddDocumentVersionCommandHandlerTests` by registering `IAuditLogger` in the fixture.
- [x] Add a fixture-composition test covering every dependency resolved by `AddDocumentVersionCommandHandler`.
- [x] Re-run the full solution. All 830 currently discovered .NET tests pass (498 service + 186 web + 146 handler).
- [x] Upgrade direct `SixLabors.ImageSharp` from vulnerable `3.1.12` to `4.1.3`; the package no longer appears in `dotnet list package --vulnerable`.
- [x] Provision `SIXLABORS_LICENSE_KEY` in CI/release secrets. The local `sixlabors.lic` is installed, Git-ignored, owner-readable only, and validated by a zero-warning Release build; the backend workflow consumes the repository/environment secret successfully.
- [x] Resolve the transitive advisories by updating the coordinated Microsoft .NET/EF/ASP.NET package family from `8.0.8` to `8.0.31`. The resolved graph now uses `Microsoft.Extensions.Caching.Memory 8.0.1`, removes the vulnerable `System.Text.Json 8.0.4` dependency, and uses test-only `SQLitePCLRaw.lib.e_sqlite3 2.1.12`. A live NuGet audit reports no vulnerable direct or transitive packages in any solution project.

### P0-3 — Frontend test gate is red and commands are misleading

**Status: completed and locally validated on 13 October 2026.**

- [x] Stabilize AdminUI `UsersPage` create-user, roles, and reset-password tests without extending timeouts; the test replaces only the animated dialog boundary while retaining form and API behavior.
- [x] Stabilize Main UI project document, assignment, and import tests by removing cross-workspace resource contention; the complete run emits no React unwrapped `act(...)` warnings.
- [x] Update `TenantEditorDialog` tests with a deterministic `getTenantModuleEffectiveAccess` mock so successful tests no longer hide console errors.
- [x] Give AdminUI and POS consistent `test:run` scripts and replace the misleading root Turbo invocation with an explicit frontend test orchestrator.
- [x] Add shared API-error parser coverage to Main UI and POS, complementing the existing AdminUI coverage.
- [x] Ensure the root test command runs every frontend application sequentially, records every failure, and returns failure only after all workspaces report. Validation: 183/183 tests pass (82 Main UI + 30 AdminUI + 71 POS).

### P0-4 — Completion claims exceed verified readiness

**Status: completed and documentation validated on 13 October 2026. The project remains not release-ready because the recorded integration and release gates are pending.**

- [x] Replace percentage-based completion with evidence states: implemented, locally validated, integration validated, and release validated.
- [x] Define capability checkboxes as implementation evidence only; modules requiring E2E, storage, migration, or operational proof are not described as release-complete.
- [x] Reconcile README test and CI statements with actual scripts and workflow conditions. Hard-disabled or credential-skipped E2E jobs explicitly do not count as passing release gates.
- [x] Correct the README Main UI test description: `npm test` runs once; it is not watch mode.
- [x] Record the tested source state, environment, database migration state, and artifact status in the current validation evidence table. Missing migration and durable-artifact evidence remains explicit rather than inferred.

### P1-1 — Project/document module is implemented but incompletely hardened

Implementation evidence (2026-10-13):

- Assignment matrix now rejects an end date earlier than its start date with a localized, user-visible explanation; its focused UI suite passes (4/4).
- Project/assignment form and state hardening completed on 17 October 2026: read-only users no longer call management-only assignee endpoints; consultant edit state is preserved; project edit loads the full detail response before saving so fields absent from the list response are not erased; and project date ranges receive the same localized validation. The focused project suites pass (8/8), the complete Main UI suite passes (87/87), typecheck passes, and lint has no errors (seven pre-existing hook warnings remain outside this scope).
- Cross-tenant project E2E coverage was added and locally integration-validated on 17 October 2026. The scenario provisions a temporary tenant B, activates an appropriately scoped tenant relationship, creates the project as tenant A through the browser, links tenant B through the browser, verifies the persisted party through the API, and cleans up its fixtures. Authentication setup and the Chromium scenario both pass (2/2) against the local API/database using an active SystemAdmin supplied through the documented `E2E_*` variables.
- The project document lifecycle E2E was implemented on 17 October 2026 and covers browser upload, version upload, preview/download of the current blob, checksum-bearing v1/v2 history, and fixture cleanup. Authentication passes and the flow reaches real storage, but integration validation is blocked because Azure returns `403 AccountIsDisabled` for the configured Blob Storage account. The storage adapter now maps this known infrastructure condition to an actionable HTTP 503 response instead of an unexpected HTTP 500. Version/history/preview assertions remain pending until the Azure subscription and storage account are restored.
- Relationship authorization E2E coverage was added and locally integration-validated on 18 October 2026. Through the project UI, the scenario confirms that a view-only relationship rejects an upload permission with HTTP 403 and the precise scope explanation, rejects a party period beyond the relationship end date with HTTP 400 and the precise validity explanation, then accepts and persists the exact permitted scope and bounded dates. Authentication and the Chromium scenario pass (2/2), and all temporary tenant, relationship, project, party, and category fixtures are removed.
- Storage-threshold E2E coverage was added and locally validated on 18 October 2026. Deterministic dashboard responses exercise the warning, soft-block, and hard-block presentation states, while a disposable tenant and real quota plan verify that an over-quota document upload is rejected by the API with HTTP 507 before Blob Storage is called. The browser now preserves the backend's actionable quota explanation for multipart uploads instead of replacing it with a generic message, byte limits are formatted without misleading `0 MB`/`0 GB` values, the focused browser scenario passes (2/2), and storage accounting tests pass (5/5). Warning and soft-block remain reporting states under the current policy; the absolute quota is the enforced upload boundary.
- Project document uploads and version uploads persist only `Path.GetFileName(...)`, preventing client-supplied path segments from becoming stored metadata.
- Blob storage now exposes idempotent deletion, and both upload handlers compensate when their first database persistence step fails. Focused version-handler coverage passes (6/6), including database-failure cleanup, storage-failure non-persistence, immutable prior history, and safe filename behavior.
- Initial document-upload compensation and retry boundaries were validated on 19 October 2026 with focused handler coverage (6/6). The tests prove document/initial-version persistence on success, uploaded-blob deletion with no database rows after a failed first persistence attempt, no document/version/ledger persistence when blob upload fails, safe filename normalization, complete dependency registration, and a single successful document/version after retrying a confirmed pre-persistence database failure. The endpoint does not currently accept an idempotency key: callers must not automatically retry an upload whose outcome is unknown (for example, a connection loss after the server may have committed); they must refresh the project document list first. This is the defined current behavior, not a claim of general request idempotency.
- Project-document upload security was hardened in code on 19 October 2026. Initial and version uploads now enforce a configurable absolute 100 MB file ceiling in addition to the tenant plan limit; reject empty, unsupported, or extension/content-mismatched files before Blob Storage; recognize PDF, PNG, JPEG, UTF-8 text/CSV, and structurally valid DOCX/XLSX/PPTX; and persist the detected canonical content type instead of trusting the browser MIME header. Signed download URLs now override the response with the canonical content type and a UTF-8 encoded `attachment` filename after path and CR/LF normalization. Focused security/header/ClamAV parsing coverage passes (16/16), both upload handler suites pass (14/14), the complete backend suite passes (859/859), and the solution builds with zero warnings.
- A streaming ClamAV adapter and fail-closed `RequireMalwareScan` policy are implemented. Infected files return the stable `document.malware_detected` error without exposing the scanner signature; required scans that are unavailable return HTTP 503 with `document.malware_scan_unavailable`. The default remains disabled because no real ClamAV endpoint has been provisioned or EICAR-tested in a deployment environment. Production must configure `DocumentSecurity:ClamAv`, set `DocumentSecurity:RequireMalwareScan=true`, and pass clean/infected/unavailable integration checks before malware protection is considered integration validated or release-ready.
- Project/document access audit durability and correlation were locally validated on 19 October 2026. Audit rows now persist the request trace identifier in an indexed `CorrelationId` column and expose it through the tenant-scoped audit-log response. Integration tests read the allowed access record directly from the database, confirm it remains queryable through the audit API, and prove that a denied authorization-boundary record carries the exact `traceId` returned to the caller in the HTTP 403 problem response. The focused suite passes (8/8), and the complete backend suite remains green (859/859). Migration `20261019022229_AddAuditLogCorrelationId` is generated but still requires the clean/upgrade database rehearsal tracked under P1-5.
- PostgreSQL query-plan review was completed locally on 18 October 2026 with a rollback-only representative workload of 5,000 projects, 50,000 documents, 150,000 versions, 50,000 access policies, and 100,000 storage-ledger rows. Project lists, project-scoped document lists, and version histories used their intended indexes; representative execution times were approximately 1.2-1.7 ms, 0.08-2.9 ms, and 0.07-1.8 ms respectively across cold/warm runs. The original storage-trend query used its index and read 100,000 raw mutation points in approximately 25-29 ms, but left response size and application materialization unbounded.
- Storage trend was bounded on 19 October 2026 with an explicit daily UTC contract: `daysBack` means 1-365 calendar-day points ending today, each point contains the latest usage for that day, and inactive days carry the last known usage forward. The response now declares its `day` granularity and inclusive UTC range. Focused web integration coverage passes (2/2), including daily latest-value selection, baseline/carry-forward behavior, tenant isolation, exact response size, and the 365-day limit. A real Npgsql provider check against 100,000 disposable ledger mutations returned exactly 365 points; measured database command time was approximately 175 ms across the baseline lookup and aggregation query. This is response/memory bounding evidence, not a query-speed improvement claim. All benchmark fixtures were deleted and the ledger table was vacuumed afterward; production workload validation remains a release gate.
- The scan-based cross-field document search was replaced on 18 October 2026 with escaped PostgreSQL `ILIKE` predicates split into document, project, and category branches, preserving case-insensitive literal-substring semantics while allowing each source table to use its own `pg_trgm` GIN indexes. The migration creates the extension and seven concurrent indexes and leaves the shared extension intact on rollback. Focused web integration coverage passes (3/3), including document/project/category matches, multi-field deduplication, and literal `%`/`_` terms. On a cleaned synthetic workload of 5,000 projects and 50,000 documents, PostgreSQL used bitmap trigram scans for the document and category branches; measured execution was approximately 2.0 ms, 8.1 ms, and 0.2 ms for the document, project, and category branches respectively, versus approximately 202-222 ms for the former post-join scan. At 5,000 rows PostgreSQL rationally retained a sequential scan for the small project table; the trigram indexes are available as that table grows. The migration was applied locally and all benchmark fixtures were deleted and vacuumed afterward; production workload validation remains a release gate.
- Storage top-consumer queries now aggregate and limit in PostgreSQL instead of loading every tenant document into application memory. A descending `(TenantId, FileSizeBytes)` index and migration reduced the representative top-document query from approximately 29.8 ms to 4.8 ms; the focused web integration test passes (1/1), and the backend builds without warnings. These figures are local synthetic evidence, not production workload validation.

- [x] Finish project assignment matrix UX and targeted project form/state tests.
- [x] Add E2E: tenant A creates a project and links tenant B. Locally integration-validated against the running API/database.
- [ ] Add E2E: upload a document, add a version, preview/download it, and verify immutable history. The test is implemented, but integration validation is blocked at upload by the disabled Azure Storage account.
- [x] Add E2E: tenant B is allowed/denied exactly according to relationship scopes and validity dates. Locally integration-validated against the running API/database.
- [x] Add E2E: storage warning, soft-block, and hard-block behavior. Dashboard states are deterministic and the real HTTP 507 quota boundary is locally integration-validated.
- [x] Run index/query-plan review for project/document search, histories, storage trend, and top-consumer queries. Completed with rollback-only PostgreSQL data; production-scale validation remains a release gate.
- [x] Replace scan-based multi-field document `Contains` search with an explicit PostgreSQL trigram design and repeat the query-plan measurement. Locally validated at 50,000 documents; production-scale validation remains a release gate.
- [x] Define and enforce daily aggregation for storage-trend responses. Responses are capped at 365 UTC day-end points with carry-forward semantics and explicit range metadata.
- [x] Add retry/compensation tests for blob upload succeeding while database persistence fails, and vice versa. Initial and version upload coverage is complete; confirmed pre-persistence failures are safe to retry, while unknown outcomes require list reconciliation because the endpoint has no idempotency key.
- [x] Enforce and test MIME/signature validation, canonical stored content types, safe cross-platform filenames, attachment download headers, and absolute plus tenant-plan upload limits.
- [ ] Provision a production-accessible ClamAV endpoint, enable it with `DocumentSecurity:RequireMalwareScan=true`, and record clean-file, EICAR rejection, timeout/unavailable fail-closed, and monitoring evidence. The adapter and policy are implemented and locally unit-tested; live scanner integration is not yet validated.
- [x] Verify audit event durability and correlation for both allowed and denied paths. Allowed records are persisted and queryable through the audit API; denied records retain the same trace ID returned in the HTTP error contract.

### P1-2 — Import and document-generation hardening remains incomplete

- [ ] Add web tests for import and generated-document endpoints, authorization, tenant isolation, content types, and file limits.
- [ ] Add mocked blob integration tests plus an optional real-container suite.
- [ ] Add E2E correction loop: download template → invalid upload → annotated errors → correction → validate → submit → verify records.
- [ ] Add E2E generation loop: generate → history → inline preview → download → regenerate/version.
- [ ] Test idempotent import submission and concurrent duplicate requests; document whether the existing implementation fully enforces the intended lock.
- [ ] Enforce and test document retention/lifecycle policy for superseded versions.
- [ ] Create import and document-generation operator runbooks, rollback steps, and failure-recovery procedures.

### P1-3 — ERP business semantics and QA expectations need reconciliation

- [ ] Audit immutable-posted/reversal-only behavior across every aggregate and endpoint, including line endpoints and direct balance mutation APIs.
- [ ] Reconcile terminology: inventory documents use `Completed/Cancelled` while UI/test documents sometimes say `Post/Reverse`; define one user vocabulary and explicit state mapping.
- [ ] Correct QA expectation that saving an inventory adjustment immediately updates balance if actual behavior requires completion/posting.
- [ ] Confirm whether manual journal creation is supported. Current controller surface is read/reverse oriented while the QA plan expects create and post.
- [ ] Confirm credit-note, return/refund, allocation, cancellation, and reversal accounting semantics end-to-end, including source status and inventory/GL effects.
- [ ] Verify partial receipt/shipment cancellation correctly restores remaining quantities and prevents over-execution under concurrency.
- [ ] Add approval rules by document type and amount beyond the current invoice workflow.

### P1-4 — Remaining reporting breadth

- [ ] Inventory valuation report endpoint and UI, using the chosen moving-average costing semantics.
- [ ] Inventory movement audit report endpoint and UI with source-document traceability.
- [ ] Low-stock/reorder recommendation report endpoint and UI with explicit reorder rules.
- [ ] Reconcile report totals to journal/inventory source data and add non-empty, tenant-isolation, date-boundary, and export tests.

### P1-5 — Release operations and observability

- [x] Complete the Cloudflare Pages cutover for Main UI, AdminUI, POS, and the public landing page using `docs/CLOUDFLARE_FRONTEND_MIGRATION.md`. Deployment jobs, custom domains, apex/`www` routing, static headers, and the landing implementation are present; Azure Static Web Apps deployment jobs were retired. The owner confirmed successful login on all three authenticated applications on 20 October 2026.
- [ ] Retire remaining Azure API/database/storage resources only after the replacement Cloud Run, Neon, and R2 environment passes cutover, rollback, and retention checks. Azure subscription remediation remains owner-managed and must not block code-first staging work.
- [ ] Apply the current migrations to both a clean database and a production-like upgraded snapshot; verify rollback/forward-fix procedure.
- [ ] Create support runbook, admin training material, incident paths, backup/restore evidence, and release smoke checklist.
- [ ] Add dashboards/alerts for API 5xx, authorization denials, import failures, document/blob failures, checkout failures, latency, rate limiting, and quota blocks.
- [ ] Define log retention, PII redaction, trace correlation, and audit retention.
- [ ] Run manual smoke flows across onboarding, permissions, inventory, orders, receipts/shipments, invoices, payments, posting, reports, POS, projects, documents, and cross-tenant access.
- [ ] Establish a release candidate only after backend, frontend, E2E, migration, and smoke gates pass on the same commit.

### P2-1 — Performance and maintainability

- [ ] Reduce the Main UI 690.05 kB minified chunk through route/vendor splitting and add a bundle budget to CI.
- [ ] Consolidate the three duplicated API clients and error parsing without coupling app-specific auth/session behavior.
- [ ] Replace handler service-locator dependency resolution with explicit constructor dependencies where practical; this improves composition safety and test clarity.
- [ ] Review large page components and separate orchestration, form state, grids, and business actions where it improves targeted testing.
- [ ] Add accessibility checks for dialogs, grids, keyboard-only POS operation, focus restoration, validation announcements, and color contrast.
- [ ] Add locale completeness tests to Main UI and AdminUI; remove hard-coded English operational messages from localized surfaces.

### P2-2 — Storage/security clarification

- [x] Generated/project documents use a private blob container and SAS-based access.
- [ ] Add automated proof that document containers cannot be anonymously read and SAS URLs expire with read-only scope.
- [x] Product images are intentionally public and non-sensitive through a dedicated R2 bucket/custom domain; private documents use a separate bucket and signed delivery. The Main UI product editor now exposes image selection, preview, upload, and actionable API errors.
- [ ] Rotate and externally manage storage credentials; verify no connection strings or signing secrets are committed.
- [ ] Threat-model cross-tenant identifiers, file preview, CSV/Excel formula injection, upload content, and signed-link leakage.

### P3 — Optional product expansion after release readiness

- [ ] Government submission package generator with manifest/metadata.
- [ ] Document expiry reminders and compliance checklists.
- [ ] OCR and metadata extraction.
- [ ] Digital-signature workflow integration.
- [ ] Tenant-to-tenant project templates.

## 5. UI/UX and feature-completion review by module — 21 October 2026

This is the implementation queue produced by the whole-frontend review. It consolidates the open P1/P2 findings above with page-, component-, action-, and feature-level findings. Every registered route and its referenced page, grid, dialog, and action in Main UI, AdminUI, and POS was source-reviewed. Authenticated read-only rendering was then inspected for 35 Main routes, four Admin routes, and two POS routes at 1440×900 and 390×844 using the ignored local-development bootstrap account. No create, edit, delete, upload, posting, payment, configuration, or other data mutation was performed.

The target is a clean, simple, data-dense business interface: one obvious primary action, compact but readable tables, predictable filters and status actions, strong keyboard/focus behavior, and actionable empty/error/permission states. Findings are plans only; implementation must be completed one tracked item at a time.

### 5.1 Shared shell, design system, permissions, and accessibility

**Findings**

- Main UI registers `/employees` twice. The first route is outside `ModuleRouteGuard`, making the later guarded route ineffective.
- Module guards cover only project and employee modules. Most Main UI routes and mutation controls do not interpret user permissions, so authorization failure often appears only after an action is attempted.
- Main UI and AdminUI duplicate shell layout/CSS, while AdminUI navigation, route titles, anonymous text, and logout controls remain hard-coded English despite its language selector.
- Feature families differ in heading hierarchy, metrics, filters, table containers, action placement, confirmations, loading/empty/error states, and feedback placement.
- Wide tables use minimum widths without one defined narrow-screen pattern. Destructive actions vary between application dialogs, native `window.confirm`, and immediate deletion.
- Runtime evidence confirms document-level horizontal overflow on Main Products at 1440 px; at 390 px it affects Audit Logs, Config Users, Config Roles, Tax/Discount, Import Data, and Reports. Narrow topbar controls also overlap page titles instead of collapsing into a usable mobile header.
- Hard-coded English remains throughout transactional, inventory, journal, report, receipt/shipment, status, success, and error surfaces.
- Several pages exceed 500–800 lines and combine data access, mutation orchestration, validation, tables, dialogs, and layout.
- Main uses a local Vite API proxy, while Admin points directly at `https://localhost:7171/api` and POS defines a proxy but bypasses it through its development API URL. Automated local browsers could not reach Admin/POS until certificate/CORS protections were disabled, making local behavior inconsistent and fragile.

**Plan**

- [x] `UX-FND-01` Removed the duplicate unguarded `/employees` route. Module-route tests prove loading, disabled employee/project routes do not render or initiate page loading, and enabled routes do both. Locally validated with 94/94 Main UI tests, lint (zero errors; seven pre-existing hook warnings), typecheck, and production build on 21 October 2026; CI validation remains pending.
- [x] `UX-FND-02` Define a permission-to-route/action matrix for every module. Hide inaccessible navigation, suppress unauthorized fetches, and hide or disable mutation controls with a reason; retain backend authorization as the security boundary.
  - Completed (22 October 2026): added canonical route and action matrices for Main UI, AdminUI, and POS; guarded every registered protected route before page mount; filtered Main/Admin navigation and configuration cards; suppressed optional unauthorized requests; added explanatory read-only mutation states; and corrected POS shift-close from the invalid `pos.shift.close` identifier to backend `pos.shift_close`. Focused authorization tests and the full 227-test frontend suite pass, along with the Main UI production build, typecheck, and lint with zero errors (six existing hook warnings remain).
  - Main UI action rollout (21 October 2026): Customers, Suppliers, Products (including expanded product identifiers), and Warehouses now remain usable in read-only mode while create/edit/delete controls and dialogs require their canonical manage permission. A translated read-only explanation identifies the required permission, and a page-level regression test covers both viewer and manager behavior.
  - Main UI action rollout (22 October 2026): Sales and purchasing orders, invoices, shipments/receipts, customer/vendor payments, and nested line editors now retain view and drill-down actions while requiring canonical manage permissions for create, edit, delete, posting, invoicing, and payment actions. Unauthorized customer, supplier, product, warehouse, and balance lookups are suppressed where those auxiliary permissions are absent; route-state-driven editors are also rejected for read-only users. A sales-order page regression test covers both viewer and manager behavior.
  - Main UI action rollout (22 October 2026): Inventory adjustments, stock counts, and stock transfers now preserve list/detail/line viewing while hiding header and line mutations plus stock-count post/reverse actions from inventory viewers. Product lookups are suppressed without `products.view`; all mutation dialogs are additionally permission-gated.
  - Main UI action rollout (22 October 2026): Accounts, fiscal periods, journals, and tax/discount configuration now preserve read access while requiring `billing.manage` for account, period, posting, and reversal mutations. Journal account-choice requests are suppressed for billing viewers. Tax-code mutations require `accounting.manage`; tenant discount preference mutations additionally require `organization.manage`, matching their backend policies. An account page regression test covers viewer and manager behavior.
  - Main UI action rollout (22 October 2026): Employees, consultants, project categories, projects, project parties, and tenant relationships now retain list/detail/history access while requiring their canonical organization, project, or tenant manage permission for mutations. Project detail continues to delegate assignments and documents to their existing fine-grained action permissions. A project viewer regression test proves detail access remains available while create/edit/delete controls are absent.
  - Main UI action rollout (22 October 2026): Company and menu preferences, product categories, user lifecycle, role assignment, and imports now expose only actions authorized by their distinct backend policies. User administration separates `users.manage` from `roles.manage` and suppresses role-option requests without `roles.view`. Imports independently support validation, submission, and history-only access without unauthorized requests. A history-only import regression test and action-matrix tests cover the split permissions.
- [x] `UX-FND-03` Create shared primitives for page header, primary action, metrics, filter toolbar, feedback, table/card body, loading, empty, and error/retry states; migrate module by module.
  - Foundation and first rollout (22 October 2026): added accessible shared page header, metric, feedback/retry, body, loading, empty, and error-state primitives. Migrated Customers, Suppliers, Products, and Warehouses, separating primary actions, filters, and responsive metrics; load failures now provide a consistent retry action. Migrated the shared order workspace as well, covering sales orders/invoices, purchase orders/invoices, inventory adjustments, stock counts, and stock transfers. Component regressions, remaining modules, and full responsive acceptance are still required before completion.
  - Finance and fulfillment rollout (22 October 2026): migrated Accounts, Fiscal Periods, Journals, Customer Payments, Vendor Payments, Sales Shipments, and Purchase Receipts. Payment metrics now use the responsive metric region, shipment/receipt selectors use the shared filter region, lazy surfaces share the loading state, and recoverable page-load failures expose the standard retry action. Organization, projects, configuration, reporting, Dashboard, AdminUI, POS, and responsive acceptance remain.
  - Organization and projects rollout (22 October 2026): migrated Employees, Consultants, Tenant Relationships, Project Categories, Projects, Project Details, and the project Document Center. Primary actions and metrics now follow one hierarchy, active/status/search/date controls use the filter region, tables use the shared body/loading treatment, and page-level failures consistently support retry. Configuration, reporting, Dashboard, AdminUI, POS, and responsive acceptance remain.
  - Main UI completion rollout (22 October 2026): migrated the configuration center and its Company, Menu, Product Categories, Roles, Users, Tax/Discount, and Import Data pages, plus Audit Logs, Reports, and Dashboard. Configuration feedback and recovery are now consistent, audit/report controls use the filter region, and Dashboard retains its specialized analytics while adopting the shared header and feedback contract. AdminUI, POS, and responsive acceptance remain before this item can close.
  - AdminUI, POS, and responsive-structure completion (22 October 2026): promoted the header, action/filter region, feedback/retry, body, and loading contracts into `@vexorion/ui`; migrated every AdminUI operational page and the POS role-management surface. The POS transaction workspace intentionally retains its task-focused catalog/cart layout while adopting the shared live feedback contract. Shared headers stack actions below titles on narrow screens, filter/action groups use breakpoint-aware layouts, tenant metrics wrap through their existing responsive containers, and POS preserves its one-column narrow-screen workspace. Typecheck and lint pass for AdminUI and POS (zero errors; five pre-existing POS hook warnings remain). Full screenshot/interaction acceptance at the standard viewport, zoom, theme, and long-label matrix remains tracked separately by `UX-FND-07` rather than blocking this foundation item.
- [x] `UX-FND-04` Standardize tables: density, pagination, sorting, search/filter reset, responsive overflow, row/action behavior, and persisted preferences where appropriate.
  - Completed (22 October 2026): centralized the operational-grid contract in `@vexorion/ui` with compact density, non-selecting action rows, consistent 10/25/50 pagination defaults, sorting support, quick-search toolbar, shared header/cell styling, and safe caller overrides. Every Main UI and AdminUI operational grid now has a stable preference key; the selected page size persists locally while each new visit starts on page one to avoid stale empty pages. Semantic detail, receipt, and cart tables retain their task-appropriate compact presentation, while shared page bodies, the table primitive, and the remaining import-history table provide narrow-screen horizontal containment. Audit Logs now has real server-side page navigation and returns to page one when filters/page size change; Audit Logs, Projects, and Project Documents expose an explicit reset for multi-field filters. Regression coverage verifies grid defaults and preference restoration. Locally validated with all 225 frontend component tests plus seven isolated E2E lifecycle tests, all five frontend production builds, Main UI lint with zero errors (six existing hook warnings), and frontend typechecks.
- [x] `UX-FND-05` Standardize destructive/irreversible actions with named targets, consequences, safe focus, processing lock, and completion feedback. Remove native confirms and immediate destructive line actions.
  - Completed (22 October 2026): introduced shared `VxConfirmActionDialog` and `VxConfirmActionButton` primitives with a named target, explicit consequence, cancel-first keyboard focus, locked dismissal and actions while processing, async failure feedback, and retry support. Replaced the remaining native confirmation and standardized destructive deletes/removals across Main UI and AdminUI, including nested order/invoice/inventory lines, organization and project records, project documents/folders, tenant administration, configuration records, and local POS transaction history. Irreversible posting, journal reversal, fiscal-period closing, stock-count posting/reversal, shipment and receipt posting, and user deactivation now require the same deliberate confirmation contract. Reversible activation/reopening, unsaved POS cart-line removal, logout/session actions, and specialized data-entry workflows remain intentionally outside the destructive confirmation primitive. Source audit finds no native `confirm` usage. Locally validated with focused confirmation behavior tests, all 227 frontend component tests plus seven isolated E2E lifecycle tests, all five frontend production builds, and lint with zero errors (the existing Main UI and POS hook warnings remain).
- [x] `UX-FND-06` Complete English, Indonesian, and Spanish localization for every visible string; add locale-key parity and no-hard-coded-operational-copy tests.
  - Localization foundation and POS rollout (22 October 2026): restored exact Main UI locale parity by translating all 110 Indonesian and 56 Spanish gaps, including employees, consultants, and bulk import; added exact-key, non-empty-value, and interpolation-variable parity tests for Main UI and AdminUI, and interpolation parity to the existing POS suite. Removed the remaining hard-coded POS operational copy from the error boundary, destructive history confirmation, receipt dialog, popup failure, and printable thermal receipt. POS now has an AST-backed regression test that rejects new hard-coded JSX copy while intentionally permitting language abbreviations. Focused localization tests and Main UI/POS production builds pass. Main UI hard-coded-copy migration remains before this item can close.
  - AdminUI completion (22 October 2026): localized the application shell/navigation, public authentication panel, tenant onboarding/editor/grid/management surfaces, user administration dialogs and destructive actions, menu-configuration controls, Dashboard headings/filters/metrics, dynamic menu labels, validation, permission copy, and user-safe fallback errors across English, Indonesian, and Spanish. The direct JSX-copy inventory was reduced from 99 findings to zero, and an AST-backed regression guard now rejects new hard-coded operational JSX copy while permitting language endonyms. Exact locale-key, non-empty-value, and interpolation parity are enforced. All 42 AdminUI tests, the production build, and lint pass. Main UI hard-coded-copy migration remains before this item can close.
  - Main UI shared and finance rollout (22 October 2026): localized shared route loading, page filter/metric accessibility labels, and retry copy, then completed the Accounts and Fiscal Periods grids, editors, validation, fallback errors, status/action labels, and destructive/closing confirmations across all three locales. The production build and focused localization/module tests pass. The remaining Main UI document, journal/reporting, sales/purchasing, inventory, and legacy configuration copy must be migrated before enabling the strict Main UI hard-coded-copy guard and closing this item.
  - Main UI sales and purchasing rollout, part 1 (22 October 2026): localized the Sales Order, Sales Invoice, Purchase Order, and Purchase Invoice grid columns and row actions, including shipment/receipt navigation, invoice creation, payment recording, and all four header-deletion confirmations. Shared order-workflow vocabulary now has matching English, Indonesian, and Spanish catalogs with exact locale parity. Editors and line-management panels remain in part 2 of this rollout.
  - Main UI sales and purchasing rollout, part 2a (22 October 2026): localized all four order/invoice line-management panels, including selection prompts, contextual descriptions, warehouse context, feedback and fallback errors, table headings, empty states, and named line-deletion actions. Interpolated document numbers and warehouse names have parity across English, Indonesian, and Spanish. The remaining editor dialogs were completed in part 2b.
  - Main UI sales and purchasing rollout, part 2b (22 October 2026): localized all four order/invoice header editors and four line-editor dialogs, including field labels, empty/required hints, loading and safe fallback errors, status choices, cost/price auto-fill messages, and create/edit/save actions. Yup validation now uses localized field labels and messages, including length and numeric constraints. Added exact locale-key/interpolation parity coverage and an AST-backed guard against hard-coded operational JSX copy in these eight dialogs. Focused localization tests (7/7), the Main UI production build, lint (zero errors; two existing Dashboard hook warnings), and `git diff --check` pass. The sales and purchasing editor rollout is complete; `UX-FND-06` remains open for the other Main UI operational-copy areas recorded above and broader Main UI coverage.
  - Main UI finance rollout, journals and reports (22 October 2026): localized journal posting/reversal actions and confirmations, feedback, journal grid statuses/details, report summaries, comparative values, drill-down controls, and report tables across English, Indonesian, and Spanish. Added locale parity/interpolation coverage and an AST-backed no-hard-coded-copy guard for the journal/report surfaces. Focused localization tests (7/7), Main UI production build, lint (zero errors; existing Dashboard hook warnings), and `git diff --check` pass. Inventory and remaining legacy operational surfaces still need migration before `UX-FND-06` can close; the broader workspace build remains blocked by existing POS test TypeScript errors.
  - Main UI inventory rollout (22 October 2026): localized Inventory Adjustments, Stock Counts, and Stock Transfers across English, Indonesian, and Spanish, including grids, line panels, editor validation, safe fallback errors, feedback, status labels, inventory context, and named destructive confirmations. Added locale-key/interpolation parity and an AST-backed inventory operational-copy guard. The focused localization tests (7/7), Main UI production build, lint (zero errors; two existing Dashboard hook warnings), and `git diff --check` pass. Legacy operational surfaces remain before `UX-FND-06` can close.
  - Main UI localization completion (22 October 2026): completed the remaining document, shipment/receipt, audit-log, configuration, tenant-onboarding, image-upload, shared lookup, and destructive-confirmation copy across English, Indonesian, and Spanish. Added a Main UI AST-backed guard across application, shared component, feature, and page TSX sources; it now rejects hard-coded operational text in JSX, localized attributes, conditional labels, and interpolated render strings. Locale key/value/interpolation parity passes. The full Main UI suite passes (130/130), production build passes, lint has zero errors (two pre-existing Dashboard hook warnings), and `git diff --check` passes. Together with the earlier AdminUI and POS localization rollouts and their parity/copy guards, `UX-FND-06` is complete.
- [x] `UX-FND-07` Add acceptance at 360, 768, 1024, and 1440 px, long translated labels, light/dark mode, and 200% browser zoom.
  - Main UI shared-shell adjustment (22 October 2026): top-bar controls now flow above the page heading below the desktop breakpoint, wrap when necessary, and truncate long signed-in labels instead of overlapping the title. Main UI tests (130/130), production build, lint (zero errors; two existing Dashboard hook warnings), and `git diff --check` pass. Interactive viewport, theme, long-label, zoom, and screenshot acceptance remain open.
  - Main UI overflow acceptance (22 October 2026): added an isolated Playwright read-only matrix for the seven previously identified overflow routes: Products, Audit Logs, Config Users, Config Roles, Tax/Discount, Import Data, and Reports. All seven pass at 360, 768, 1024, and 1440 px with Spanish/dark mode; each also passes a 720 CSS-pixel proxy for 200% zoom from a 1440 px viewport and 360 px Indonesian/light mode. The run captured 35 screenshots; tenant provisioning, authentication, cleanup, and orphan check all passed. Fixed page-body horizontal containment for wide tables, applied it to user and tax-code tables, contained report tables, wrapped long page-header text, and corrected Import Data translation-key namespaces exposed by the long-label run. The 8-test Playwright run, including setup, passes; all frontend workspace tests (249/249 plus 7 E2E lifecycle subtests), production build, lint (zero errors; two existing Dashboard hook warnings), and `git diff --check` pass. Actual browser zoom (rather than its reduced-viewport proxy), populated edge cases, remaining routes, and AdminUI/POS matrix coverage remain open.
  - Main UI full-route sweep (22 October 2026): expanded the matrix to all 35 authenticated registered routes at 360, 768, 1024, and 1440 px, Spanish/dark mode, a 720 px narrow-width proxy, and 360 px Indonesian/light mode. All 36 Playwright cases including setup/authentication passed after fixing Project Documents filters and Stock Counts actions.
  - AdminUI and POS responsive sweep (22 October 2026): added isolated route matrices for all four AdminUI routes and both POS routes at 360, 768, 1024, and 1440 px, plus a 360 px Indonesian/light-mode check per route. All six route cases and both setup/authentication checks passed with cleanup and orphan checks. Fixed AdminUI dashboard-shell horizontal containment and narrow layouts for tenant metrics/legend and menu rows; the shell now falls back to the user's email rather than rendering an empty display name as `undefined`. POS header actions now wrap, checkout panels are width-constrained, and payment controls stack on narrow screens.
  - Validation: all three frontend suites pass serially (Main UI 130/130, AdminUI 42/42, POS 77/77); all three production builds pass; lint passes with zero errors (two existing Main UI Dashboard and five existing POS hook warnings); `git diff --check` passes. POS TypeScript now includes its already-installed Node types so the existing AST localization test is typechecked by the production build.
  - Actual zoom and dialog acceptance (23 October 2026): verified real 200% browser zoom in the integrated browser, confirming DPR 2 and a 317×361 CSS viewport rather than relying on the 720 px proxy. All 35 authenticated Main UI routes (Spanish/dark), four AdminUI routes, and both POS routes (Spanish/dark) rendered without document-level horizontal overflow. At actual zoom, opened and inspected the Main UI Create Product form with temporary unsaved values, the AdminUI Add Tenant User form, and the POS Close Shift dialog; each stayed within the viewport, with long form content scrollable where needed. No mutation was submitted; temporary form values were discarded. Main UI catalog and POS product data were empty in the local backend, while AdminUI/POS user grids rendered existing rows, so populated transactional detail states were unavailable. The existing headless Chromium zoom shortcut checks remain skipped because headless Chromium does not apply browser zoom; the manual integrated-browser check supplies the actual-zoom evidence. UX-FND-07 acceptance is complete.
  - Playwright output hygiene: generated `playwright-report/`, `test-results/`, and `blob-report/` directories are ignored repository-wide and are not retained as acceptance evidence.
- [x] `UX-FND-08` Add WCAG-oriented acceptance for headings/landmarks, focus, icon names, keyboard dialogs/grids, focus restoration, live feedback, non-color status cues, and contrast.
  - Shared dialog and shell accessibility rollout (23 October 2026): confirmation dialogs now expose their title and content as the accessible name and description; the existing safe-focus behavior is covered alongside Escape dismissal and focus restoration. Added accessible names and expanded-state semantics for Main UI/AdminUI mobile navigation controls and a localized accessible name for the POS theme toggle. Focused tests and the broader review of headings/landmarks, grids, live feedback, non-color status cues, and contrast remain in progress.
  - Shared accessibility follow-up (23 October 2026): all shared `VxDialog` instances now connect their dialog role to the contained title automatically, avoiding per-dialog ID wiring; regression coverage confirms accessible naming, Tab/Shift+Tab focus containment, Escape dismissal, and focus restoration. Main UI, AdminUI, and POS expose a main landmark; page/login titles use semantic h1 elements; shared data grids get a readable name from their stable preference key unless the caller supplies a localized `aria-label`; shared success/info feedback uses a polite status role and errors retain alert semantics. Confirmed icon-only controls identified in the workspace search now have accessible names. Added a keyboard-visible 3px focus outline in both themes across all three apps and corrected dark-mode primary button foreground contrast (from 2.52:1 to 5.68:1); theme regression checks require at least 4.5:1 for primary controls. Focused acceptance tests pass (Main UI 14/14; POS 23/23), as do all three app production builds, the shared UI package typecheck, and `git diff --check`. A full contrast audit across custom surfaces and browser/assistive-technology acceptance for all headings, landmarks, grids, and status cues remain before UX-FND-08 can close.
  - Heading and feedback semantics follow-up: shared page metrics and dashboard KPI values are no longer exposed as headings; shared empty/error titles, dashboard sections, and POS catalog/cart sections use a deliberate heading hierarchy. Removed redundant polite live-region wrappers around shared feedback so each status or alert is announced according to its own role. Focused UI/POS tests (40/40), all three app production builds, shared UI typecheck, and `git diff --check` pass. UX-FND-08 remains open for a complete contrast audit and browser/assistive-technology acceptance across the workspace.
  - Main UI browser acceptance follow-up (23 October 2026): inspected the running dashboard accessibility snapshot and confirmed a single main landmark plus dashboard section heading levels. The snapshot exposed an h5 shell duplicate before the page's h1 and h6 headings for the storage subtopics; the shell duplicate is now visual-only and storage subtopics are h4 under their h3 section. Re-inspection confirms the page starts at h1, followed by h2 sections and the h3/h4 storage hierarchy. Focused UI tests (5/5), Main UI production build, and `git diff --check` pass. Browser/assistive-technology acceptance on the remaining routes and full custom-surface contrast audit remain.
  - Main UI mobile navigation acceptance follow-up (23 October 2026): live browser inspection found the mobile drawer dialog lacked an accessible name and its links were outside a navigation landmark. The drawer paper is now labelled "Navigation" and the link groups are contained in a named navigation landmark. The running page accessibility snapshot confirms both names; Escape closes the dialog and restores focus to the Navigation button. Focused UI tests (6/6), Main UI production build, and `git diff --check` pass. The complete route and assistive-technology sweep remains.
  - AdminUI/POS browser follow-up: AdminUI public-auth promotional labels now render as non-heading text; live reload confirms the login page has a single h1. POS's delivery switch has a localized accessible name, and its empty-catalog information is exposed as a polite status rather than an assertive alert. Live inspection confirms both semantics. POS focused accessibility tests (13/13), POS and AdminUI production builds, and `git diff --check` pass. AdminUI remained unauthenticated, and POS has no products available; remaining authenticated-route checks and the custom-surface contrast audit are still open. No Playwright/E2E result was generated or included. The complete route and assistive-technology sweep remains.
  - Admin dashboard and transactional feedback follow-up (23 October 2026): live inspection found a duplicate shell/page h1 and KPI labels exposed as h6 headings on the AdminUI dashboard. The shell title is now visual-only, and shared VxCard supports a configurable title element; dashboard and tenant KPI labels render as paragraphs. Live reload confirms a single page h1, h2 dashboard sections, and non-heading KPI labels. Main UI sales-order prerequisite/read-only warnings now use polite status roles while actual errors remain alerts; live page inspection and a focused regression test confirm the role split. AdminUI tests (42/42), all three production builds, shared UI typecheck, Main UI OrderWorkspace accessibility test (1/1), and `git diff --check` pass. Remaining workspace route/interaction acceptance and the complete custom-surface contrast audit remain open. No Playwright/E2E tests were run. The complete route and assistive-technology sweep remains.
  - AdminUI tenant-route acceptance attempt: `/tenants` remained on its loading state during inspection, so its populated table and controls could not be evaluated; returned the shared page to the dashboard without interaction or data changes. The complete route and assistive-technology sweep remains.
  - AdminUI tenant accessibility follow-up (23 October 2026): authenticated tenant management rendered a populated tenant grid. The page heading incorrectly read "Loading tenant tools..." after load, and the disabled-modules filter switch had no accessible name. Replaced the heading with the localized Tenants label and associated the switch with its localized filter label. Live inspection confirms an h1 "Tenants", one named switch, and the populated named grid. AdminUI tests (42/42), production build, shared UI typecheck, and `git diff --check` pass. No tenant data was changed. The complete route and assistive-technology sweep remains.
  - Custom contrast test expansion (23 October 2026): added explicit dark-theme text-contrast assertions for regular, hover, and active sidebar navigation in Main UI and AdminUI. Theme contrast and primitive snapshot tests (8/8), Main UI production build, and `git diff --check` pass. This is targeted regression coverage, not completion of the full custom-surface audit; POS-specific surfaces and translucent/gradient layers still require review. The complete route and assistive-technology sweep remains.
  - Cross-app primary contrast follow-up (23 October 2026): live POS light-theme inspection showed the outlined Return/Refund control used the pale secondary color (#A29BFE, 2.18:1 on the light app surface). The outlined control and stock-transfer destination chip now use the primary palette; light primary was deepened consistently across all three apps to #6252DB, which provides 5.03:1 on the light theme background. Added assertions for primary text-on-surface, theme text, and focus contrast in AdminUI/POS and added primary-on-surface coverage to Main UI. POS focused tests (15/15), AdminUI theme tests (2/2), Main UI suite (142/142 with one updated theme snapshot), all three builds, shared UI typecheck, and `git diff --check` pass. POS was restored to light mode after visual inspection. Gradient/translucent custom surfaces and broader route/assistive-technology acceptance remain open; no Playwright/E2E tests were run. The complete route and assistive-technology sweep remains.
  - Semantic palette and translucent-card contrast follow-up (23 October 2026): POS audit identified light warning and error semantic colors below WCAG AA for normal text, so all three app themes now use consistent accessible success/warning/error foregrounds and contrast text in light/dark modes. Added contrast assertions for semantic text and foregrounds against the default surface and composited translucent paper surface. All tested colors pass 4.5:1; light warning/error on cards are 5.66:1 and 5.29:1, and dark error on cards is 4.76:1. Focused theme tests pass across Main UI, AdminUI, and POS (12 tests total); Main UI theme snapshot updated; production builds and shared UI typecheck pass. Theme gradient stop sampling, custom component-specific colors, and remaining route/assistive-technology acceptance still require review. No Playwright/E2E tests were run.
  - Public-auth gradient contrast follow-up (23 October 2026): the translucent white eyebrow/description text could fall below 4.5:1 over the brightest purple gradient overlays. Main UI and AdminUI now use opaque white for the public-auth eyebrow and descriptive text. A regression test checks the conservative compounded overlay surface (#6554c8); white text measures 5.74:1. Contrast tests pass in Main UI and AdminUI (12 tests total), and builds/typechecks remain green. Remaining custom-color and full route/assistive-technology review remain open. No Playwright/E2E tests were run.
  - Public-auth brand contrast follow-up (23 October 2026): the Main UI and AdminUI brand overlines still used translucent white inline styling, outside the earlier CSS contrast checks. Changed both to opaque white and extended the regression test to cover each layout against the conservative #6554c8 gradient surface. Main UI contrast tests pass (9/9), Main UI and AdminUI production builds pass, and `git diff --check` passes. The cross-app route/keyboard sweep and custom-surface contrast review remain open. No Playwright/E2E tests were run.
  - Main UI user/product action naming follow-up (23 October 2026): live User Management inspection found the role-assignment combobox and save button lacked the affected user's context. Both now have localized, user-specific accessible names, with regression coverage. Product-grid expand/collapse, edit, and delete icon controls now include the product name, with a dedicated accessibility test. Focused Main UI tests pass (3/3), production build passes, and `git diff --check` passes; live HMR confirms the role combobox and save button names. POS route inspection remains read-only; its session-expiry dialog blocked further dialog checks, so no controls were activated. No business data was changed and no Playwright/E2E tests were run.
  - POS transactional keyboard and cart controls follow-up (23 October 2026): live dialog review found Shift Summary and Cash Reconciliation exposed as h6 beneath the Close Shift dialog title; these are now h3 with regression coverage. The Return & Refund dialog had no Escape/outside-close handler during search/review; it now closes through the standard dialog keyboard path unless a return is actively processing, and an Escape test covers the search state. Live browser inspection confirmed Escape closes Return & Refund and restores focus to its trigger; the Close Shift dialog remained open until Cancel was explicitly selected, so no shift was closed. POS cart table is now named, and quantity edit is a keyboard-operable button with a named spinbutton; discount and remove controls include the product name. Main UI Users table now has a name. Focused POS tests pass (13/13), Main UI tests pass (2/2), POS and Main UI builds pass, and `git diff --check` passes. POS catalog remained empty; no transaction or business data was changed. No Playwright/E2E tests were run.
  - AdminUI tenant-grid status follow-up (23 October 2026): the live tenant row previously announced module availability only as P/D/E, requiring users to infer meaning from a separate legend. Each chip now exposes the localized full module name and enabled/disabled state; tenant edit/remove actions also name their target tenant. Live snapshot now announces the row's full module statuses, and the focused TenantDataGrid tests pass (3/3). AdminUI production build and `git diff --check` pass. No tenant data was changed and no Playwright/E2E tests were run.
  - POS and AdminUI tabular semantics follow-up (23 October 2026): POS and Main UI grids received accessible table names; POS edit-quantity is keyboard-operable with a visible focus outline and product-specific accessible name, and its discount/removal controls also include the product. The live tenant page still displayed an incomplete abbreviation legend alongside the now-explicit accessible chip labels; the visual legend remains pending translation/clarification. POS Close Shift currently has no keyboard Escape close by design, with Cancel available; Return & Refund closes with Escape and returns focus to its trigger. Broader custom-color contrast and route acceptance remain.
  - Cross-app status palette and remaining control names (23 October 2026): the contrast audit caught light-mode secondary/info palette foregrounds that were not covered by the earlier primary/success/warning/error checks. All three app themes now define AA-contrast secondary and info colors; regression assertions cover those foregrounds against the default and translucent paper surfaces plus contrast text. POS administration and receipt/return tables are named, its per-user POS-role switch is named, AdminUI menu toggles and Main UI project-category active switch receive contextual names, and the Main UI public-auth feature labels no longer introduce unintended h6 headings. Full Vitest suites pass (Main UI 148/148; AdminUI 45/45; POS 87/87), all three production builds pass, and `git diff --check` passes. Live UI sessions subsequently redirected to login after 401s, so the complete authenticated route/keyboard sweep and third-party screen-reader acceptance remain outstanding; UX-FND-08 remains open pending that acceptance.
  - Cross-app live-feedback follow-up (23 October 2026): actionable POS refund/login and AdminUI login/tenant-onboarding errors now expose assertive alert roles; POS refund success is polite status, and the POS error boundary announces runtime failures as alerts. Added a POS error-boundary accessibility regression test. POS focused live-feedback tests pass (3/3); AdminUI focused tenant/user tests pass (7/7); AdminUI and POS production builds pass; `git diff --check` passes. Broader route/keyboard acceptance and the custom-surface contrast audit remain open. No Playwright/E2E tests were run.
  - Main UI route heading sweep (23 October 2026): live snapshots of Reports, Customers, Sales Orders, and Configuration confirmed the main landmark and page-level h1. Reports had h6 report summaries; sales order lines/documents also rendered as h6. Changed report summaries, line/document panels, project detail sections, configuration cards/sections, and journal workflows to meaningful heading levels; metric values and promotional auth copy remain non-heading text, and the tenant onboarding form now has an h1. Live verification confirms Reports uses h2 summaries, Sales Orders uses h2 line/document sections, and Configuration cards use h2. Focused UI tests (8/8), Main UI and AdminUI builds, shared UI typecheck, and `git diff --check` pass.
  - Configuration and projects browser follow-up (23 October 2026): authenticated User Management renders a page h1, h2 for create/list sections, labelled form controls, and a semantic table; Projects renders a page h1, named filters/metrics/grid, and a clear empty state. Data is empty, so project-detail and populated row/dialog states are not available for live acceptance. Remaining UX-FND-08 work is to complete live route checks where representative data is available, verify keyboard behavior on representative interactive widgets, and finish the custom-surface contrast audit.
  - User-management keyboard-accessible control follow-up (23 October 2026): live snapshot showed the active-state switch without an accessible name. The switch input now receives a localized name combining the Active column label and the user's name; added a focused regression test. Focused test (1/1), Main UI production build, and `git diff --check` pass. A browser hard navigation subsequently returned API 401 responses, so additional live checks are paused until the authenticated workspace session is restored.
  - Authenticated browser and keyboard follow-up (23 October 2026): after the user restored the Main UI session, confirmed User Management again exposes the named "Active: admin" switch and populated user row; Projects and Sales Orders remain valid but empty states. Opened the Create Customer dialog without submitting; its title and all fields are announced, Tab/Shift+Tab remain contained, Escape dismisses the dialog, and focus returns to New customer. Opened the Deactivate User confirmation without confirming; Escape dismissed it and focus returned to the active switch, leaving the account active. Visually inspected the customer shell in light and dark modes, then restored light mode. The 6 focused accessibility/theme test files (13/13), Main UI production build, shared UI typecheck, and `git diff --check` pass. AdminUI browser acceptance could not run because port 5174 is not serving; a full contrast audit and other route/widget acceptance remain.
  - Custom-shell contrast pass (23 October 2026): measured the light navigation palette against its palest sidebar surface and found the small sidebar caption at 3.01:1, hover text at 4.37:1, and three decorative navigation icons below 3:1. Darkened the caption and hover text and adjusted those icon accents; a CSS contrast regression test checks light/dark sidebar text and all seven Main UI icon accents (3:1 minimum). Theme tests check the 3:1 focus-indicator contrast against each theme surface and 4.5:1 primary-control text. The public authentication panel’s opacity text was checked against each gradient stop; the minimum is 5.24:1. Admin dashboard date-range chips expose their selected state with `aria-pressed` in addition to color and outline styling. Focused accessibility suites pass (Main UI 17/17; POS 23/23); all three app builds, shared UI package typecheck, AdminUI targeted lint, and `git diff --check` pass. Broader custom-component contrast and assistive-technology checks remain open.
  - Selected-state and status announcements (23 October 2026): the Project Details section controls now expose their selected state via `aria-pressed`, complementing the visual contained/outlined styles; the not-found page uses a page-level h1; and POS barcode feedback announces errors assertively but success politely. The focused Main UI (17/17) and POS (23/23) accessibility test suites, all three app builds, shared UI typecheck, targeted lint (zero errors; existing hook warnings remain), and `git diff --check` pass. No browser/E2E runs were performed. Remaining heading hierarchy and third-party screen-reader/browser checks still need acceptance.
  - Authenticated cross-app acceptance refresh (23 October 2026): after the browser sessions were restored, confirmed the Main UI user-role combobox closes with Escape and regains focus, the POS user-management table and user switch have contextual accessible names, and the AdminUI tenant editor exposes a named dialog, labelled fields, and a correctly nested h3 preview heading. Cancel closed the editor and restored focus to the tenant's Edit action without saving. The full Vitest suites pass (Main UI 148/148, AdminUI 45/45, POS 87/87); after the heading correction, the focused AdminUI tenant-editor tests pass (4/4), its production build passes, and `git diff --check` passes. UX-FND-08 remains open for the remaining route/keyboard and third-party screen-reader acceptance plus any unreviewed custom-surface contrast cases. No Playwright/E2E tests were run.
  - Cross-app acceptance closeout pass (23 October 2026): refreshed live authenticated snapshots for Main UI User Management and Reports, AdminUI Dashboard and Tenants, and POS home/admin. Confirmed page h1/main landmarks, report and dashboard h2 hierarchy, labelled forms and grids, named tenant/POS switches and tables, textual module/status cues, and POS empty-catalog status semantics. Opened POS Return & Refund without submitting a search; Escape closed it and restored focus to its trigger. Reviewed the remaining inline POS refund-summary surface (translucent green background with inherited readable text and semantic success chip) alongside the existing checks for light/dark app palettes, translucent paper, focus outlines, navigation text/icons, and public-auth gradients. Targeted contrast regressions pass (16/16 across Main UI, AdminUI, POS). No business data or settings were changed and no Playwright/E2E tests were run. Implementation, browser snapshots, keyboard samples, and automated contrast checks are complete; UX-FND-08 remains unchecked only until a human verifies representative flows with an actual screen reader (browser accessibility snapshots are not a substitute).
  - Assistive-technology acceptance (23 October 2026): the user confirmed VoiceOver is working on the requested representative Main UI, AdminUI, and POS options, including the page/section structure, named controls and status cues, and the POS Return & Refund dialog. Together with the cross-app browser, keyboard, automated contrast, and regression-test evidence above, UX-FND-08 is complete.
- [x] `UX-FND-09` Protect unsaved multi-field/multi-line edits and preserve list filters/context when returning from details.
  - Initial Main UI rollout (23 October 2026): added a localized shared unsaved-changes confirmation and applied it to the eight Sales/Purchase Order/Invoice header and line editors, plus project create/edit, project detail, and project-party editors. Clean forms close directly; dirty forms require an explicit keep-editing or discard choice, and dismissal is blocked while saving. Project status and related-tenant filters are encoded in the list URL and passed through the detail route so Back returns to the filtered list. Added focused prompt and project-context regression tests, plus exact locale-key/interpolation parity coverage. Targeted tests pass (14/14), Main UI production build passes, and `git diff --check` passes. The complete editor/workflow inventory, route/browser navigation-away protection, and preservation of list/grid state beyond project filters remain before UX-FND-09 can close.
  - Main UI continuation and closeout (23 October 2026): extended the localized prompt to customer, supplier, product and product-identifier, warehouse, account, fiscal-period, customer-payment, and vendor-payment editors; project-category create/edit, employee, consultant, tenant-relationship and activation, project-assignment, and configuration product-category forms; company, tax/discount, user-role, tenant-onboarding, and data-import workflows; project document folder, upload, metadata, and version dialogs; Sales Shipment and Purchase Receipt header/line forms; and Inventory Adjustment, Stock Count, and Stock Transfer headers and line editors. Dirty forms restore their captured baseline on confirmed discard; save/load states block dismissal. The shared hook warns before browser unload and supports a centralized SPA navigation blocker. Migrated Main UI routing to React Router's data router so sidebar links, browser Back/Forward, and programmatic route changes are guarded. Project status and related-tenant filters remain URL-backed and the project detail Back action returns to that filtered list; no other list-to-detail routes exist in the current Main UI route tree. Added integration regressions for assignment and document-upload discard flows (including file-input reset) and SPA navigation blocking. Full Main UI validation passes: 157 tests across 41 files, production build, and `git diff --check`.
- [x] `UX-FND-10` Replace scattered console logging with approved telemetry and user-safe feedback, retaining support trace IDs.
  - Completion (23 October 2026): reused the existing backend Serilog-to-Grafana-Loki pipeline; no OpenTelemetry SDK or browser-side Loki credentials were added. Added an authenticated client-diagnostics endpoint with a 20-per-minute IP rate limit and strict application/event/status/code/trace-ID validation. Main UI, AdminUI, and POS report only bounded metadata (never exception text, stack traces, request bodies, or form values); server logs include both the originating API trace reference and the diagnostic request trace ID. Replaced raw frontend error logging, retained localized/user-safe feedback, and removed raw runtime exception details from the POS crash screen and error buffer.
  - Validation: backend Web tests pass (206); Main UI, AdminUI, and POS suites pass (158, 47, and 88 tests); all three production builds pass; `git diff --check` passes.
- [x] `UX-FND-11` Complete authenticated read-only rendering at 1440×900 and 390×844 for all currently reachable Main/Admin/POS routes. Evidence found no navigation, console, or page errors, and identified the overflow/layout defects recorded in this section. Interactive dialogs and mutation states remain part of each implementation item's acceptance.
- [x] `UX-FND-12` Standardized Main UI, AdminUI, and POS local routing on browser-relative `/api` requests proxied to `https://localhost:7171` with development-certificate tolerance. Added consistent tracked environment examples, corrected local development values, updated the README, and made a resolved-Vite-config contract check part of the root frontend test command. Locally validated with the proxy contract check, 195/195 frontend tests, all frontend builds, and lint (zero errors; existing hook warnings remain) on 21 October 2026. A live proxy smoke was not repeated because the backend was not listening and a fresh backend build did not complete during the validation window; CI validation also remains pending.

### 5.2 Authentication and public entry

**Findings**

- Main UI and AdminUI ship demo tenant, email, and password values in component state. AdminUI tells users to use a seeded demo tenant.
- Main UI describes ASP.NET Core, JWT refresh, a “control plane,” and a CRUD workspace rather than the product's business value.
- AdminUI mixes production administration with development guidance and untranslated content.
- POS login is a small context-free card in a largely empty viewport and does not explain the cashier/store application or support path.
- Password visibility, Caps Lock feedback, and an explicit recovery path are absent. The recovery model still needs a product/security decision.

**Plan**

- [x] `UX-AUTH-01` Remove embedded demo credentials/development guidance from shipped pages; keep examples only in local setup/seed documentation. Completed: Main and Admin sign-in forms start empty, and the seeded-tenant guidance and development hints are removed from all three apps.
- [x] `UX-AUTH-02` Rewrite Main login around connected sales, purchasing, inventory, finance, projects, and team operations, avoiding framework terminology. Completed: Main sign-in and the shared public shell now describe connected sales, purchasing, inventory, finance, projects, and teams in en/es/id, with no framework terminology.
- [x] `UX-AUTH-03` Rewrite and localize Admin login around tenant onboarding, platform users, module/menu governance, and restricted administrator access. Completed: Admin sign-in copy is localized (en/es/id) around tenant onboarding, platform users, module/menu governance, and restricted administrator access.
- [x] `UX-AUTH-04` Redesign POS login as a branded, responsive, touch-friendly cashier entry screen with concise store/shift context. Completed: POS sign-in is a branded, responsive card with shift/secure-access context and 56px touch targets. Localized in en/es/id.
- [x] `UX-AUTH-05` Add password visibility, Caps Lock feedback, autocomplete attributes, enter-key/focus verification, and consistent invalid-session feedback. Completed: shared `VxPasswordField` provides a show/hide toggle and a Caps Lock status message. All three apps use autocomplete attributes, and a session-expired notice appears after refresh failure or a 401 on an existing session. Locally validated with unit tests (Main 163, Admin 52, POS 91), production builds, and updated E2E label selectors; Playwright was not run.
- [x] `UX-AUTH-06` Self-service forgot/reset password (Main UI only) approved and implemented: `POST api/auth/forgot-password` (always 202, no account enumeration), `reset-password/validate`, `reset-password`; rate limited (`password-reset`, 10/10 min per IP), audited, stateless HMAC token (15 min, single-use via security stamp + password hash), all sessions revoked on reset, reset and password-changed emails via Resend (en/es/id), dev-only `Email:RedirectPlusAddressing` sends `name+tag@x` mail to `name@x`. Config: `Email:ResendApiKey`, `FromAddress`, `MainUiBaseUrl`. Admin UI/POS not included; Playwright not run.

### 5.3 Dashboard and navigation

**Findings**

- Dashboard breadth is strong, but KPIs, charts, aging, cash flow, orders, customers, health, storage, and quick statistics compete without role/task prioritization.
- Hero copy includes product-development language (“not a placeholder homepage”).
- Hidden menu preference, disabled module, and missing permission are not clearly distinguished.
- Several Main pages include developer-facing descriptions such as live API paths and implementation details instead of explaining the user's task.

**Plan**

- [ ] `UX-DASH-01` Establish a hierarchy: critical KPI row, exceptions/attention, trend analysis, and recent activity; keep filters beside affected data.
- [ ] `UX-DASH-02` Replace development copy and add plain-language definitions for KPI dates, windows, signs, and currency.
- [ ] `UX-DASH-03` Give each section loading/error/retry and last-updated context so one failed query is unambiguous.
- [ ] `UX-DASH-04` Distinguish preference, module entitlement, and permission states, including administrator effective-access preview.

### 5.4 Master data and configuration

Scope: Customers, Suppliers, Products, Categories/Identifiers, Warehouses, Accounts, Employees, Consultants, Company, Users, Roles, Menu, Tax/Discount, and numbering configuration.

**Findings**

- Similar list/editor modules use different headings, metrics, grids/tables, delete patterns, validation feedback, and localization coverage.
- Product image, identifiers, stock, and price history are split between expandable rows and dialogs, making the main view/edit path unpredictable.
- Accounts use native delete confirmation. Role/configuration screens expose technical concepts with limited downstream-impact guidance.
- Employee, consultant, project assignment, and relationship surfaces need a clearer record/engagement boundary.

**Plan**

- [ ] `UX-MASTER-01` Apply the shared list/editor pattern across master data with consistent search, active filters, counts, empty states, and named deletion.
- [ ] `UX-MASTER-02` Give Product a coherent detail/edit experience for core data, image, identifiers, stock by warehouse, and price history.
- [ ] `UX-MASTER-03` Replace native/immediate deletion with the shared destructive-action pattern.
- [ ] `UX-MASTER-04` Show dependency/impact before delete/deactivate and explicitly distinguish deactivation from permanent deletion.
- [ ] `UX-MASTER-05` Explain role, menu, tax/discount, numbering, and module consequences in business language and preview effective access.
- [ ] `UX-MASTER-06` Reconcile employee, consultant, assignment, and tenant-relationship vocabulary and avoid duplicate entry where references are safe.

### 5.5 Sales, procurement, billing, and payments

Scope: Sales Orders/Shipments/Invoices/Customer Payments and Purchase Orders/Receipts/Invoices/Vendor Payments.

**Findings**

- Order/invoice pages share a useful workspace idea but duplicate grids, editors, line panels, status maps, hard-coded copy, and mutations.
- Numeric statuses are mapped client-side; allowed next actions and disabled-action reasons are not consistently presented.
- Receipt/shipment line entry uses dense dialog tables without explicit narrow-screen/keyboard acceptance.
- Payment allocation lacks one consistent balance/allocation/unapplied/over-allocation summary.
- P1-3 semantic questions remain open: immutable posted records, cancel/reverse vocabulary, partial fulfillment under concurrency, credit notes/refunds, allocations, and approvals.

**Plan**

- [ ] `UX-TRADE-01` Create a shared document-workspace contract for filters, status, metrics, rows, lines, totals, and confirmations while preserving business rules.
- [ ] `UX-TRADE-02` Show lifecycle and permitted next actions on every document, including reasons and confirmation for post/approve/cancel/reverse.
- [ ] `UX-TRADE-03` Add a detail-first review view for header, parties, dates, terms, lines, totals, fulfillment/allocation, generated documents, audit, and state actions.
- [ ] `UX-TRADE-04` Optimize receipt/shipment entry for keyboard/tablet, showing ordered, previously processed, remaining, entered, and resulting quantities.
- [ ] `UX-TRADE-05` Standardize payment allocation summaries and pre-submit validation.
- [ ] `FEAT-TRADE-01` Complete P1-3 semantics and encode agreed transitions/accounting/inventory effects in backend rules, API codes, UI, and tests.
- [ ] `FEAT-TRADE-02` Decide and implement approval rules by document type/amount with approver visibility and history.

### 5.6 Inventory operations

Scope: Adjustments, Counts, Transfers, Receipts, Shipments, balances, and movements.

**Findings**

- Adjustment, count, and transfer pages are 580–770 line components with nested header, line, status, and delete dialogs plus hard-coded strings.
- Line deletion can be immediate while document delete/post/reverse is confirmed; risk handling is inconsistent.
- Lifecycle terminology alternates between complete/cancel and post/reverse.
- Balance/movement behavior exists, but there is no focused movement/audit workspace and the valuation/reorder reports remain pending.

**Plan**

- [ ] `UX-INV-01` Split operations into list, detail, line editor, and state-action components with a consistent document workspace.
- [ ] `UX-INV-02` Make expected versus entered/resulting quantities, variance, warehouses, and posting effects explicit before confirmation.
- [ ] `UX-INV-03` Standardize line/document confirmations, prevent immutable-state edits, and explain why.
- [ ] `FEAT-INV-01` Finalize lifecycle vocabulary and reversal behavior across API, UI, tests, and `TEST_PLAN.md`.
- [ ] `FEAT-INV-02` Implement P1-4 valuation, movement audit, and reorder reports with reconciliation tests.

### 5.7 Finance, fiscal periods, journals, reports, and audit

**Findings**

- Journal posting/reversal asks users to paste invoice or journal GUIDs—an unsafe implementation-oriented routine workflow.
- Finance pages mix localized shells with hard-coded English columns, actions, statuses, filters, and feedback.
- Audit browsing is a basic table/filter scaffold without readable event detail, before/after presentation, trace navigation, or export/support flow.
- Report reconciliation/export coverage and inventory report breadth remain incomplete.

**Plan**

- [ ] `UX-FIN-01` Replace raw-ID journal actions with searchable contextual document selection; prefer posting from the source document where safer.
- [ ] `UX-FIN-02` Provide a fiscal-period calendar/status view and warn about locks before users complete unpostable forms.
- [ ] `UX-FIN-03` Standardize currency/date/sign formatting, totals, comparisons, drill-down, export progress, and no-data explanations.
- [ ] `UX-FIN-04` Add an audit detail drawer with actor, tenant, action, entity, time, trace ID, safe before/after, copyable support context, pagination, and export.
- [ ] `FEAT-FIN-01` Decide manual-journal support: implement balanced draft/create/post/reverse or remove that expectation from QA/UI.
- [ ] `FEAT-FIN-02` Complete report reconciliation, tenant/date-boundary, non-empty, and CSV formula-injection tests.

### 5.8 Projects, documents, assignments, and tenant relationships

**Findings**

- Functionality is broad, but Project Details (831 lines) and Documents Panel (726 lines) contain too many concepts/actions in one surface.
- Global Document Center versus project-specific Documents responsibility/navigation is insufficiently explained.
- Relationship/party forms expose raw tenant IDs and JSON scope text, which is error-prone for administrators.
- Malware scanning remains intentionally disabled pending private scanner integration and live evidence.

**Plan**

- [ ] `UX-PROJ-01` Restructure Project Details into Overview, Parties, Assignments, Documents, and History tabs with counts, permissions, and deep links.
- [ ] `UX-PROJ-02` Clarify global Document Center versus project Documents and preserve navigation/filter context.
- [ ] `UX-PROJ-03` Replace tenant-ID entry with an authorized picker and JSON scope editing with named controls plus effective-access summary.
- [ ] `UX-PROJ-04` Add document breadcrumbs/clear selection and prioritize Preview, Download, Upload Version, Metadata, and Delete by frequency/risk.
- [ ] `FEAT-PROJ-01` Complete live ClamAV integration only with private `clamd`, monitoring, and clean/EICAR/unavailable fail-closed evidence.
- [ ] `FEAT-PROJ-02` Finish document retention/lifecycle and unknown-upload-outcome reconciliation guidance.

### 5.9 Import and generated documents

**Findings**

- Import functionality exists, but the correction loop and idempotent/concurrent submission behavior lack E2E evidence.
- Generated-document history/preview/download/regenerate exists, but authorization, isolation, retention, real-storage behavior, and recovery remain incomplete.

**Plan**

- [ ] `UX-IMP-01` Present import as choose type → template → file → validate → correct → confirm → submit → monitor; prevent accidental duplicate submission.
- [ ] `UX-IMP-02` Make errors searchable/actionable with sheet, row, column, field, cause, and retry path.
- [ ] `UX-DOC-01` Standardize generated-document panels with version, format, state, creator/time, preview, download, regenerate, and failure recovery.
- [ ] `FEAT-IMP-01` Complete all P1-2 endpoint, tenant-isolation, idempotency, E2E, storage, retention, rollback, and runbook work.

### 5.10 Admin UI

**Findings**

- Dashboard, Tenants, Users, and Menu Configuration cover core administration but use hard-coded English shell/navigation copy.
- Tenant management fetches effective module access separately per tenant, creating N+1 requests and partial-row failure risk.
- UsersPage combines create, role assignment, and password reset in one 355-line page with six dialog instances.
- Menu Configuration does not clearly distinguish preference, module entitlement, and permission.
- The authenticated user chip renders `undefined · TenantAdmin`, showing a mismatch between the Admin UI's display-name expectation and the current-user contract.
- Admin dashboard showed zero tenants and users while its Tenant/User screens showed existing records. The dashboard data contract, filters, permissions, and loading semantics therefore need reconciliation before its metrics are trusted.
- At 390 px, topbar controls overlap the page title; the Users header becomes a narrow text column beside its filters/button, and action/status columns are outside the initial visible grid area.

**Plan**

- [ ] `UX-ADMIN-01` Fully localize the shell/pages and align list, metrics, filters, loading, empty, feedback, and actions with Main UI.
- [ ] `UX-ADMIN-02` Replace per-tenant access requests with a summary/batch contract or lazy detail; expose partial failure/retry.
- [ ] `UX-ADMIN-03` Split creation, roles, account state, and password reset into a clear user detail/action model with audit/security context.
- [ ] `UX-ADMIN-04` Explain lifecycle/module/menu changes and preview the result, distinguishing platform policy, entitlement, role permission, and preference.
- [ ] `FEAT-ADMIN-01` Review user deactivate/reactivate, session revocation, credential rotation, tenant suspend/reactivate, and audit history; implement approved semantics only.

### 5.11 POS UI and transaction integrity

**Findings**

- Desktop uses `3fr 1fr` for catalog/cart, but the cart contains six columns plus payment controls. Its narrow column is structurally incompatible with its content.
- Catalog/scanner/customer/delivery/shift/return/history/language/theme/admin actions compete without a strong cashier-task hierarchy.
- Quantity edit is hidden behind clicking plain text. Discount accepts formatted free numeric text, increasing cashier error risk.
- Checkout is client-orchestrated across multiple API operations; a mid-flow failure can leave partial business records and unsafe retry ambiguity.
- Return/refund similarly coordinates multiple effects without atomic/idempotent reconciliation evidence.
- Useful shortcuts, conflict handling, shifts, receipts/history, and telemetry exist, but the design does not prioritize fast scan-add-pay or touch targets.
- Runtime evidence confirms document widths of 653 px for POS and 563 px for POS Admin in a 390 px viewport. Header actions overlap/clip, and the POS Admin table extends beyond its card without an obvious responsive affordance.

**Plan**

- [ ] `UX-POS-01` Redesign around select/scan → review cart/customer → payment, with a usable minimum cart width and deliberate single-column tablet/mobile mode.
- [ ] `UX-POS-02` Replace the six-column cart with compact line items exposing increment/decrement/direct quantity, discount, stock warning, remove, and total.
- [ ] `UX-POS-03` Keep scanner/search and high-frequency product selection persistent; group shift/history/returns/settings as clearly labelled secondary actions.
- [ ] `UX-POS-04` Make payment a focused step with tender presets, method, amount due, change, validation, progress, retry/recovery, explicit success, and duplicate prevention.
- [ ] `UX-POS-05` Improve shift, history, receipt, return/refund, conflict, and customer dialogs for touch, keyboard, long content, and consequences.
- [ ] `UX-POS-06` Add cashier-oriented empty/offline/session-expiry/recovery states that never imply an unknown transaction is safe to retry.
- [ ] `UX-POS-07` Validate keyboard/scanner operation, touch targets, focus, labels, 1024×768 use, and receipt printing on supported hardware/browsers.
- [ ] `FEAT-POS-01` Replace client checkout orchestration with one atomic, idempotent server command covering shift, permission, stock, pricing, discount, order, invoice, shipment, payment, and receipt.
- [ ] `FEAT-POS-02` Replace multi-call return/refund with an atomic idempotent workflow and reconcile inventory, credit note, refund/payment, source transaction, and audit.
- [ ] `FEAT-POS-03` Decide whether pilot needs hold/resume, void reason, manager override, cash movement, end-of-day reconciliation, offline mode, or hardware integration before implementing them.

### 5.12 Review coverage and completion evidence

| Application | Reviewed surface | Review evidence | Remaining runtime evidence |
|---|---|---|---|
| Main UI | Login, dashboard, 35 distinct protected routes, feature pages, grids, panels, dialogs, API actions, shell, responsive CSS | Source review plus authenticated 1440×900 and 390×844 rendering; no navigation/console/page errors; seven overflow routes identified across the two viewports | Interactive dialog/action states, dark mode, 768/1024 widths, zoom, and populated edge cases |
| AdminUI | Login, dashboard, tenants, users, menu configuration, dialogs, shell | Source review plus authenticated 1440×900 and 390×844 rendering; no navigation/console/page errors | Interactive action states, dark mode, 768/1024 widths, metric-contract reconciliation, and populated edge cases |
| POS | Login, sale workspace, product catalog, cart/payment, shifts, receipts/history, returns/refunds, conflicts, admin | Source review plus authenticated 1440×900 and 390×844 rendering; no navigation/console/page errors; both narrow routes overflow | Read-only dialog inspection, 1024×768 hardware-oriented pass, populated cart, scanner/keyboard, dark mode, receipt, and mutation recovery states |

- [x] `E2E-FND-01` Provision one isolated automation tenant for every Playwright run and make it the default tenant for every E2E project and test:
  - Use environment-provided SystemAdmin/control-plane credentials only in global setup; never embed them in source, reports, traces, screenshots, or browser storage distributed to individual tests.
  - Generate a collision-safe tenant identity such as `e2e-<run-id>-<worker-suffix>`, then provision its company, administrator/test users, roles/permissions, tenant plan, module configuration, menu defaults, and the minimum deterministic reference data required by the suite.
  - Authenticate Main UI, AdminUI, and POS against the provisioned tenant and generate app-specific Playwright storage states. Tests must not fall back to `demo`, `vexorionerp`, or any manually maintained tenant.
  - Share the run tenant where safe, but namespace mutable fixtures per worker/test so parallel execution cannot collide. Tests that modify tenant-wide configuration must run serially or receive a dedicated child tenant.
  - Pass tenant/user IDs and codes through typed fixtures rather than hard-coded values. Each test must create only the business records it owns and clean them in reverse dependency order.
  - Add global teardown that removes test records, users, storage objects, and the automation tenant even after test failure. Preserve sanitized diagnostics before cleanup and provide an explicitly controlled retain-on-failure option for local debugging.
  - Add hard safety checks: refuse destructive E2E setup/teardown unless the API environment is explicitly marked non-production, reject protected tenant codes, require the generated E2E prefix, and verify the authenticated tenant ID before every cleanup call.
  - Record provisioning, authentication, test, cleanup, and orphan-detection results as CI artifacts without secret/token values. A run fails if setup, any test, cleanup, or the final orphan check fails.
  - Cover setup/teardown idempotency, partial provisioning failure, retry behavior, parallel workers, interrupted runs, expired sessions, and orphan cleanup with focused automated tests.
  - Locally validated on 21 October 2026 — the shared lifecycle provisions through the existing onboarding contract, requires explicit non-production opt-ins, rejects protected hosts/codes, verifies SystemAdmin control identity, removes control credentials before test workers start, writes ignored per-run credentials, cleans prefixed child tenants before the primary tenant, and records sanitized provision/authentication/test/cleanup/orphan outcomes. Mutable fixture identifiers are run-scoped, and every child tenant inherits the run prefix so interrupted cleanup can find it. Hard tenant deletion removes distinct project-document versions, generated documents, and product images from configured storage before deleting database rows; storage failures preserve the tenant record and return an actionable gateway error. Retention is local-only, explicit, and limited to failed runs. Focused lifecycle tests pass 7/7, tenant storage-cleanup tests pass 3/3, the handler failure-path test passes 1/1, and the complete backend suite passes 887/887. A live Main UI run provisioned and authenticated an isolated tenant, passed all six authentication scenarios (including invalid credentials and logout), then deleted the tenant with the orphan check passing. A separate forced-interruption rehearsal left guarded metadata and a tenant behind; the next run removed that orphan before provisioning, authenticating, testing, and cleaning its own tenant. All three Playwright configurations use the generated tenant without demo/manual-tenant fallbacks. CI Playwright jobs remain intentionally disabled until a disposable non-production API/database exists; that deployment decision does not weaken the local production-host refusal guard.
- [ ] Each implementation item receives focused behavior tests and before/after screenshots.
- [ ] Each mutation is tested for permission denial, validation, conflict, duplicate submission, unknown outcome, and recovery messaging.
- [x] Each currently reachable route received an authenticated read-only render at desktop and narrow widths before implementation.
- [ ] Each implementation item receives a full interactive acceptance pass afterward, including its dialog, populated, validation, permission, and recovery states.
- [ ] All frontends pass lint, typecheck, tests, build, accessibility scan, browser-console check, and critical Playwright flows on one commit.
- [ ] No item is marked complete from source presence alone; use section 2 evidence states.

## 6. Recommended delivery sequence

### Milestone UX-1 — Shared foundations, authentication, and isolated E2E

Scope: `UX-FND-*`, `UX-AUTH-*`, and `E2E-FND-01`.

Exit criteria:

- Routes, permissions, page structure, feedback, destructive actions, localization, responsiveness, and accessibility have one tested contract.
- All three login experiences are production-safe, accurate, localized, responsive, and accessible.
- The authenticated baseline visual walkthrough is recorded.
- Every E2E run provisions and safely removes its own automation tenant; all application test projects use that tenant and cannot target protected environments or tenant codes.

### Milestone UX-2 — POS safety and usability

Scope: `UX-POS-*`, `FEAT-POS-01`, and `FEAT-POS-02`; decide `FEAT-POS-03` separately.

Exit criteria:

- Cashier scan/add/pay and return flows are usable at target desktop/tablet sizes and by keyboard/scanner.
- Checkout and refund are atomic, idempotent, audited, and recover safely from conflicts and unknown outcomes.
- Shift, history, receipt, and recovery flows pass interactive acceptance.

### Milestone UX-3 — Core ERP workspaces

Scope: dashboard, master/configuration, trade, inventory, and finance items in sections 5.3–5.7.

Exit criteria:

- Core lists/details/forms share the foundation patterns and remain data-dense and responsive.
- Lifecycle, accounting, inventory, approval, allocation, and journal semantics are agreed and tested.
- Required inventory reports and audit/support workflows are complete.

### Milestone UX-4 — Projects, documents, imports, and platform administration

Scope: sections 5.8–5.10 and their mapped P1 items.

Exit criteria:

- Complex project/document/admin pages are decomposed into task-oriented workflows.
- Raw identifiers/JSON configuration are replaced with safe business controls.
- Import/generated-document correction, idempotency, storage, retention, and operator paths pass E2E acceptance.

### Milestone R5 — Operations and optional expansion

Scope: remaining P1-5/P2 security/performance work, parked `MIG-M06`, and then P3 only after UX-1 through UX-4 are complete.

## 7. Definition of done for every future item

An item is done only when all applicable conditions are satisfied:

- [ ] Business rule and state transition are explicit, including tenant and permission behavior.
- [ ] API success and error contracts are defined with machine-readable codes.
- [ ] Backend implementation, migration/configuration, frontend workflow, and localization are complete.
- [ ] Unit/integration tests cover success, validation, conflict, permission, tenant isolation, and retry/reversal paths.
- [ ] Critical user flow has E2E evidence where applicable.
- [ ] Logging/audit/telemetry are present without leaking sensitive data.
- [ ] Documentation and runbooks are updated in this file or the README/QA plan as appropriate.
- [ ] Repository-wide build and test gates pass on the same commit.

## 8. Documentation ownership

- `README.md`: setup, architecture, commands, and concise feature overview.
- `DEVELOPMENT_PLAN.md` (this file): implementation status, findings, priorities, roadmap, and release gates.
- `TEST_PLAN.md`: executable manual QA scenarios; it must be reconciled with actual workflow semantics during R1/R2.
- `SalesKit/*`: customer-facing sales material, not implementation status.

Historical milestone/checklist/roadmap documents were removed after consolidation because their duplicated status markers had diverged from the current code and test evidence.
