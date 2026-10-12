# VexorionERP Consolidated Review and Development Plan

Last reviewed: 13 October 2026
Review basis: repository documentation, backend/domain/database/service/handler/controller code, the three frontend applications, automated tests, build configuration, and local validation described below.

This is the single source of truth for implementation status and upcoming development work. A checked item means the capability is present in the current repository; it does not by itself mean production readiness. Release readiness requires the quality gates in this document to pass.

## 1. Executive assessment

VexorionERP has broad functional coverage: core ERP workflows, POS, finance, imports, generated documents, project/document management, tenant collaboration, module controls, and storage governance are all represented in code. The frontend production build succeeds and the service test project is healthy.

The project is **not release-ready**. The most important gap is consistency rather than missing screens:

1. API errors do not use one stable response contract, and many UI call sites discard the server's useful message. Users can therefore receive generic or misleading feedback that does not explain the cause or recovery action.
2. The full backend test suite is red: 7 tests fail in authorization auditing and project-document version handling.
3. The combined frontend test command is red and several React tests are timing-sensitive or produce unwrapped-state-update warnings.
4. Historical plans contradict both one another and the code. Some implemented work remains unchecked, while some “complete” sections have failing validation or missing E2E evidence.
5. Release hardening remains incomplete: E2E coverage for newer modules, storage reliability, operational runbooks, monitoring, dependency remediation, and an immutable-posted-document audit.

The recommended next milestone is therefore a **consistency and release-hardening milestone**, not another broad feature expansion.

## 2. Review method and confidence

### Inspected

- Root README and all former milestone, roadmap, migration, project/document, deployment, and phase plans.
- Domain models, EF Core configuration/migrations, contracts, services, handlers, controllers, permissions, middleware, and dependency registration.
- Main UI, AdminUI, POS routes, API clients, error handling, feature pages, and test suites.
- CI/workspace scripts and recent repository history.

### Executed on 12 October 2026

| Check | Result | Evidence / implication |
|---|---|---|
| `npm run build` | PASS | All four frontend workspaces built. Main UI emitted a chunk-size warning for a 690.05 kB minified chunk. |
| `dotnet test VexorionERP.sln --no-restore --verbosity minimal -m:1` | FAIL | Services: 498/498 pass. Web: 169 pass, 5 fail. Handlers: 140 pass, 2 fail. |
| `npm run test:run` | PASS but incomplete as a root gate | Only Main UI defines `test:run`; 75/75 Main UI tests passed. AdminUI, POS, and shared UI were not exercised by this command. |
| `npm test` | FAIL | AdminUI had 2 timeout failures; the combined run also exposed 4 Main UI failures before Turbo stopped sibling tasks. Numerous React `act(...)` warnings indicate test instability. |

### Not validated in this review

- Database migration against a clean and upgraded PostgreSQL database.
- Azure Blob integration against a real container.
- Playwright E2E flows requiring running services and credentials.
- Production deployment, rollback, performance, accessibility, or penetration testing.

Any capability requiring those checks is “implemented, validation pending,” not production-complete.

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

**Observed implementation**

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

**Status: implementation and Debug validation completed on 13 October 2026; Release licensing remains an external prerequisite.**

- [x] Fix the failing `AuthorizationBoundaryAuditTests`. The audit middleware now wraps authorization, so it observes and persists 403 policy denials that short-circuit before controllers and handlers.
- [x] Document the audit boundary: authorization policy denials must persist an `authorization.access_denied` event; audit failures are logged but must not replace or prevent the 403 response.
- [x] Fix the failing `AddDocumentVersionCommandHandlerTests` by registering `IAuditLogger` in the fixture.
- [x] Add a fixture-composition test covering every dependency resolved by `AddDocumentVersionCommandHandler`.
- [x] Re-run the full solution. All 827 currently discovered .NET tests pass (498 service + 186 web + 143 handler).
- [x] Upgrade direct `SixLabors.ImageSharp` from vulnerable `3.1.12` to `4.1.3`; the package no longer appears in `dotnet list package --vulnerable`.
- [ ] Provision `SIXLABORS_LICENSE_KEY` in developer/CI/release environments. ImageSharp 4 permits Debug builds without it but rejects Release builds when a valid license is absent.
- [ ] Resolve the newly detected transitive advisories separately: `Microsoft.Extensions.Caching.Memory 8.0.0`, `System.Text.Json 8.0.4`, and test-only `SQLitePCLRaw.lib.e_sqlite3 2.1.6`. These enter through the .NET 8.0.8 EF/design/SQLite dependency graph and were not the direct ImageSharp advisory addressed here.

### P0-3 — Frontend test gate is red and commands are misleading

- [ ] Fix AdminUI `UsersPage` create-user and reset-password test timeouts.
- [ ] Stabilize Main UI project document, assignment, and import tests; eliminate React unwrapped `act(...)` warnings instead of increasing timeouts blindly.
- [ ] Update `TenantEditorDialog` test mocks to include `getTenantModuleEffectiveAccess`; tests currently pass while logging mock failures.
- [ ] Give every workspace a consistent `test:run` script or change the root script. Today `npm run test:run` exercises only Main UI while appearing repository-wide.
- [ ] Add shared API-error parser tests to Main UI, AdminUI, and POS.
- [ ] Ensure the root test command waits for and reports every workspace result rather than cancelling siblings after the first failure.

### P0-4 — Completion claims exceed verified readiness

- [ ] Replace percentage-based completion with evidence-based states: implemented, locally validated, integration validated, release validated.
- [ ] Do not mark a module complete while its required test gate is red or its E2E/storage/migration evidence is absent.
- [ ] Reconcile README test/CI statements with actual scripts. The README says each frontend workflow runs E2E, but workflow jobs explicitly skip when secrets are absent; skipped E2E must not count as a passing release gate.
- [ ] Correct the README Main UI test description: its `npm test` script runs once, not in watch mode.
- [ ] Record the tested commit, environment, database migration state, and artifact links in release evidence.

### P1-1 — Project/document module is implemented but incompletely hardened

- [ ] Finish project assignment matrix UX and targeted project form/state tests.
- [ ] Add E2E: tenant A creates a project and links tenant B.
- [ ] Add E2E: upload a document, add a version, preview/download it, and verify immutable history.
- [ ] Add E2E: tenant B is allowed/denied exactly according to relationship scopes and validity dates.
- [ ] Add E2E: storage warning, soft-block, and hard-block behavior.
- [ ] Run index/query-plan review for project/document search, histories, storage trend, and top-consumer queries.
- [ ] Add retry/compensation tests for blob upload succeeding while database persistence fails, and vice versa.
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
