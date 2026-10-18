# VexorionERP Consolidated Review and Development Plan

Last reviewed: 18 October 2026
Review basis: repository documentation, backend/domain/database/service/handler/controller code, the three frontend applications, automated tests, build configuration, and local validation described below.

This is the single source of truth for implementation status and upcoming development work. A checked item means the capability is present in the current repository; it does not by itself mean production readiness. Release readiness requires the quality gates in this document to pass.

## 1. Executive assessment

VexorionERP has broad functional coverage: core ERP workflows, POS, finance, imports, generated documents, project/document management, tenant collaboration, module controls, and storage governance are all represented in code. The frontend production build succeeds and the service test project is healthy.

The project is **not release-ready**. P0-1 through P0-3 corrected the error contract, backend gate, vulnerable dependencies, and frontend gate. Remaining readiness gaps are evidence and operational hardening rather than basic unit-test health:

1. Playwright jobs are defined but hard-disabled in CI, so there is no current E2E release evidence.
2. Clean-install and upgrade migration rehearsals against PostgreSQL have not been recorded.
3. Real Azure Blob integration, compensation, private-access expiry, backup/restore, rollback, monitoring, performance, accessibility, and penetration checks remain unvalidated.
4. Several critical workflows still need the P1/P2 tests and semantic reconciliation listed below.
5. No single release-candidate commit has passed backend, frontend, E2E, migration, storage, and smoke gates together.

The next milestone is **workflow and release hardening (R2/R3)**, not another broad feature expansion.

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

### Current validation evidence — 13 October 2026

| Check | Result | Evidence / implication |
|---|---|---|
| Source state | RECORDED | Commit `bf635b7a1b1fa9b5299c347a783c28b67d4bfae1` on `master`; P0-1 through P0-3 were present in this clean source state. P0-4 documentation edits require a later commit before they can be release evidence. |
| Environment | RECORDED | macOS 26.7.1, .NET SDK 10.0.301 targeting .NET 8, Node 22.22.0, npm 10.9.4. |
| `dotnet build VexorionERP.sln -c Release --no-restore` | PASS | Zero warnings and zero errors with the local Six Labors license. |
| `dotnet test VexorionERP.sln --no-restore --disable-build-servers --verbosity minimal -m:1 -p:UseSharedCompilation=false` | PASS | 830/830: Services 498, Web 186, Handlers 146. |
| `dotnet list VexorionERP.sln package --vulnerable --include-transitive --no-restore` | PASS | NuGet reported no vulnerable direct or transitive packages in all nine projects. |
| `npm run test:run` | PASS | 183/183: Main UI 82, AdminUI 30, POS 71; no hidden mock errors or React `act(...)` warnings. |
| `npm run build` | PASS WITH WARNING | All four frontend packages built; Main UI emitted the known chunk-size warning. |
| Database migration state | NOT VALIDATED | Migration files and model snapshot exist, but neither a clean database migration nor an upgrade rehearsal was executed or linked. |
| Durable artifacts | NOT RECORDED | Local terminal validation produced no durable artifact URLs. CI artifact/run links must be recorded against a release-candidate commit. |

### Still not validated

- Database migration against a clean and upgraded PostgreSQL database.
- Azure Blob integration against a real container.
- Playwright E2E flows requiring running services and credentials.
- Production deployment, rollback, performance, accessibility, or penetration testing.

Any capability requiring those checks remains **implemented** or **locally validated**, not integration- or release-validated.

## 3. Implemented capability inventory

### 3.1 Platform and architecture

- [x] ASP.NET Core 8 API with EF Core/PostgreSQL.
- [x] Tenant-aware domain model, query filtering, claims/policy authorization, audit infrastructure, rate limiting, HTTPS/HSTS, and CSP headers.
- [x] CQRS/Mediator handlers alongside application services.
- [x] React/Vite Main UI, AdminUI, and POS workspaces plus shared `@vexorion/ui` package.
- [x] Access-token refresh handling in all three frontend API clients.
- [x] CI definitions for backend, frontend builds/tests, and credential-gated E2E jobs.
- [x] Current frontend production build succeeds.

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
- The API already has a 100 MB request-size ceiling and read-only, short-lived blob URLs. This is transport-level evidence only: MIME/signature validation and malware scanning are not implemented yet and remain release-blocking items below.
- PostgreSQL query-plan review was completed locally on 18 October 2026 with a rollback-only representative workload of 5,000 projects, 50,000 documents, 150,000 versions, 50,000 access policies, and 100,000 storage-ledger rows. Project lists, project-scoped document lists, and version histories used their intended indexes; representative execution times were approximately 1.2-1.7 ms, 0.08-2.9 ms, and 0.07-1.8 ms respectively across cold/warm runs. The storage-trend index was used and returned 100,000 points in approximately 25-29 ms, but the unbounded response size still requires a product-level pagination or downsampling decision.
- The scan-based cross-field document search was replaced on 18 October 2026 with escaped PostgreSQL `ILIKE` predicates split into document, project, and category branches, preserving case-insensitive literal-substring semantics while allowing each source table to use its own `pg_trgm` GIN indexes. The migration creates the extension and seven concurrent indexes and leaves the shared extension intact on rollback. Focused web integration coverage passes (3/3), including document/project/category matches, multi-field deduplication, and literal `%`/`_` terms. On a cleaned synthetic workload of 5,000 projects and 50,000 documents, PostgreSQL used bitmap trigram scans for the document and category branches; measured execution was approximately 2.0 ms, 8.1 ms, and 0.2 ms for the document, project, and category branches respectively, versus approximately 202-222 ms for the former post-join scan. At 5,000 rows PostgreSQL rationally retained a sequential scan for the small project table; the trigram indexes are available as that table grows. The migration was applied locally and all benchmark fixtures were deleted and vacuumed afterward; production workload validation remains a release gate.
- Storage top-consumer queries now aggregate and limit in PostgreSQL instead of loading every tenant document into application memory. A descending `(TenantId, FileSizeBytes)` index and migration reduced the representative top-document query from approximately 29.8 ms to 4.8 ms; the focused web integration test passes (1/1), and the backend builds without warnings. These figures are local synthetic evidence, not production workload validation.

- [x] Finish project assignment matrix UX and targeted project form/state tests.
- [x] Add E2E: tenant A creates a project and links tenant B. Locally integration-validated against the running API/database.
- [ ] Add E2E: upload a document, add a version, preview/download it, and verify immutable history. The test is implemented, but integration validation is blocked at upload by the disabled Azure Storage account.
- [x] Add E2E: tenant B is allowed/denied exactly according to relationship scopes and validity dates. Locally integration-validated against the running API/database.
- [x] Add E2E: storage warning, soft-block, and hard-block behavior. Dashboard states are deterministic and the real HTTP 507 quota boundary is locally integration-validated.
- [x] Run index/query-plan review for project/document search, histories, storage trend, and top-consumer queries. Completed with rollback-only PostgreSQL data; production-scale validation remains a release gate.
- [x] Replace scan-based multi-field document `Contains` search with an explicit PostgreSQL trigram design and repeat the query-plan measurement. Locally validated at 50,000 documents; production-scale validation remains a release gate.
- [ ] Define and enforce pagination, sampling, or aggregation for storage-trend responses before high-volume tenants can return unbounded ledger points.
- [ ] Add retry/compensation tests for blob upload succeeding while database persistence fails, and vice versa. Version-upload coverage is complete; add equivalent initial-upload coverage and define retry/idempotency behavior.
- [ ] Verify malware/content scanning, MIME/signature validation, safe filenames, download headers, and maximum upload limits. These controls were not established by the current plans.
- [ ] Verify audit event durability and correlation for both allowed and denied paths.

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

- [ ] Complete the Cloudflare Pages migration closeout for Main UI, AdminUI, POS, and the public landing page using `docs/CLOUDFLARE_FRONTEND_MIGRATION.md`. Cloudflare deployment jobs, custom domains, apex/`www` cutover, static security/cache headers, and the landing implementation are present; Azure Static Web Apps deployment jobs were retired at owner direction on 2026-10-16. Azure resource deletion, API restoration, API-backed smoke tests, and the full stability evidence remain pending.
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
- [ ] Review product-image storage separately: it currently creates a blob-public container. Confirm that public product images are intentional; otherwise migrate to private access/CDN or signed delivery.
- [ ] Rotate and externally manage storage credentials; verify no connection strings or signing secrets are committed.
- [ ] Threat-model cross-tenant identifiers, file preview, CSV/Excel formula injection, upload content, and signed-link leakage.

### P3 — Optional product expansion after release readiness

- [ ] Government submission package generator with manifest/metadata.
- [ ] Document expiry reminders and compliance checklists.
- [ ] OCR and metadata extraction.
- [ ] Digital-signature workflow integration.
- [ ] Tenant-to-tenant project templates.

## 5. Recommended delivery sequence

### Milestone R1 — Trustworthy failures and green baseline

Scope: P0-1 through P0-4.

Exit criteria:

- One documented and tested error contract is used by every API and frontend.
- Users see the actual safe business cause plus recovery guidance.
- All backend and frontend unit/integration tests pass without hidden console errors or React state warnings.
- Dependency vulnerability gate passes or has a time-bound, approved exception.
- Root commands accurately exercise all intended workspaces.

### Milestone R2 — Workflow and security hardening

Scope: P1-1 through P1-3 and P2-2.

Exit criteria:

- Project/document/import/generation E2E critical paths pass.
- Tenant isolation, permission denial auditing, storage compensation, private access, upload security, and expiry behavior have automated evidence.
- ERP state transitions and accounting/inventory side effects match the agreed domain semantics.

### Milestone R3 — Reporting and operational readiness

Scope: P1-4, P1-5, and essential P2 work.

Exit criteria:

- Remaining inventory reports are implemented and reconciled.
- Clean/upgrade migration rehearsal, backup/restore, monitoring, support documentation, and full manual smoke pass are complete.
- A single release candidate commit passes every required gate.

### Milestone R4 — Optional expansion

Scope: P3 only after R1–R3 are complete.

## 6. Definition of done for every future item

An item is done only when all applicable conditions are satisfied:

- [ ] Business rule and state transition are explicit, including tenant and permission behavior.
- [ ] API success and error contracts are defined with machine-readable codes.
- [ ] Backend implementation, migration/configuration, frontend workflow, and localization are complete.
- [ ] Unit/integration tests cover success, validation, conflict, permission, tenant isolation, and retry/reversal paths.
- [ ] Critical user flow has E2E evidence where applicable.
- [ ] Logging/audit/telemetry are present without leaking sensitive data.
- [ ] Documentation and runbooks are updated in this file or the README/QA plan as appropriate.
- [ ] Repository-wide build and test gates pass on the same commit.

## 7. Documentation ownership

- `README.md`: setup, architecture, commands, and concise feature overview.
- `DEVELOPMENT_PLAN.md` (this file): implementation status, findings, priorities, roadmap, and release gates.
- `TEST_PLAN.md`: executable manual QA scenarios; it must be reconciled with actual workflow semantics during R1/R2.
- `SalesKit/*`: customer-facing sales material, not implementation status.

Historical milestone/checklist/roadmap documents were removed after consolidation because their duplicated status markers had diverged from the current code and test evidence.
