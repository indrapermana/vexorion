# Playwright Regression Traceability

Last reviewed: 16 November 2026

This matrix cross-references the 118 manual cases in `VexorionERP_FULL_REGRESSION_TEST_COVERAGE.xlsx` with the current Main UI, Admin UI, and POS Playwright suites.

## Coverage rules

- **Full**: Playwright exercises the workflow and verifies the material persisted/API outcomes described by the manual case.
- **Partial**: Playwright exercises only part of the case, such as navigation, form availability, one validation branch, or a happy path without reconciliation.
- **Missing**: no meaningful automated assertion covers the case's business outcome.
- A green page-load or responsive-layout test does not count as functional workflow coverage.
- A conditionally skipped or assertion-free branch cannot raise a case above Partial.

## Summary

| Area | Cases | Full | Partial | Missing |
|---|---:|---:|---:|---:|
| Foundation | 12 | 0 | 9 | 3 |
| Admin UI | 10 | 0 | 10 | 0 |
| Master data | 14 | 0 | 12 | 2 |
| Sales | 9 | 0 | 5 | 4 |
| Purchasing | 8 | 0 | 4 | 4 |
| Inventory | 11 | 8 | 0 | 3 |
| Finance | 13 | 0 | 7 | 6 |
| Projects | 7 | 0 | 6 | 1 |
| Imports | 4 | 3 | 1 | 0 |
| POS | 18 | 2 | 13 | 3 |
| Security | 5 | 0 | 2 | 3 |
| Operations | 7 | 0 | 2 | 5 |
| **Total** | **118** | **13** | **71** | **34** |

## Foundation

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| FND-001 | Missing | None | Production URLs, TLS certificates, and both health endpoints are not checked. |
| FND-002 | Partial | `VexorionERP.UI/e2e/auth.spec.ts` — TC-M-001 | Does not explicitly fail on console/network errors. |
| FND-003 | Partial | `VexorionERP.AdminUI/e2e/auth.spec.ts` — TC-A-001 | Successful login is checked, but authenticated refresh persistence is not. |
| FND-004 | Partial | `VexorionERP.POS/e2e/auth.spec.ts` — TC-P-001 | Login is checked, but the complete authorized-action boundary is not. |
| FND-005 | Partial | All three `auth.spec.ts` wrong-password tests | Unknown-tenant behavior and information-disclosure equivalence are not checked across all apps. |
| FND-006 | Missing | None | Forgot-password email, token, reset, single use, and old-password rejection are not automated. |
| FND-007 | Missing | None | Transparent refresh and terminal session expiry are not automated. |
| FND-008 | Partial | Main `permissions.spec.ts`; Admin/POS protected-route auth tests | UI redirect is covered; complete permission profiles, API 403 behavior, no-data-flash, and audit are not. |
| FND-009 | Partial | Main `dashboard.spec.ts` TC-M-010/011; `config.spec.ts` UX-DASH-04 | Only selected navigation/deep-link behavior is covered. |
| FND-010 | Partial | POS `settings.spec.ts` TC-P-022; Main `dashboard.spec.ts` UX-DASH-02 | Locale switching/presentation is not checked across every app or after reload. |
| FND-011 | Partial | All three `responsive.acceptance.spec.ts`; targeted UX tests | Route matrices are covered, but browser-zoom tests remain skipped and visual contrast is not comprehensive. |
| FND-012 | Partial | Responsive suites and targeted dialog/touch tests | No complete keyboard order, focus restoration, screen-reader, and live-region audit exists. |

## Admin UI

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| ADM-001 | Partial | `users.spec.ts` TC-A-018; `tenants.spec.ts` TC-A-005/006 | Page/card presence is checked, not summary accuracy and complete states/links. |
| ADM-002 | Partial | `tenants.spec.ts` TC-A-008/009 | Creation is covered; normalization, uniqueness, and persisted-detail reconciliation are incomplete. |
| ADM-003 | Partial | `tenants.spec.ts` TC-A-010 | Empty-name validation only; field-level causal messages and focus are incomplete. |
| ADM-004 | Partial | `tenants.spec.ts` TC-A-011 | Edit dialog opens; status changes and downstream authentication effects are not exercised. |
| ADM-005 | Partial | `tenants.spec.ts` TC-A-012 | Confirmation/cancel is covered; protected/populated/deletion outcomes are not. |
| ADM-006 | Partial | `user-workflows.spec.ts` TC-A-023/024/025 | User creation is covered; resulting tenant-scoped login/access is not. |
| ADM-007 | Partial | `user-workflows.spec.ts` TC-A-026/027/028 | Password reset/status controls are covered; complete lifecycle authentication effects are not. |
| ADM-008 | Partial | `users.spec.ts` TC-A-015; `user-workflows.spec.ts` TC-A-022 | Filtering is covered; cross-tenant read/update denial and audit are not. |
| ADM-009 | Partial | `users.spec.ts` TC-A-019 | Page availability only; saved tenant-specific menu behavior is not exercised. |
| ADM-010 | Partial | Admin `auth.spec.ts` TC-A-003; responsive route suite | Unauthenticated routing is covered, not the complete Admin permission matrix/API denial. |

## Master data

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| MST-001 | Partial | Main `config.spec.ts` TC-M-048/049 | Form/page presence only; update persistence and immutable identity are not checked. |
| MST-002 | Partial | Main `config.spec.ts` TC-M-050/051 | Form availability only; complete tenant user lifecycle is not checked. |
| MST-003 | Partial | Main `config.spec.ts` TC-M-052/UX-DASH-04; `permissions.spec.ts` | Role page/access basics are covered, not effective permission changes after session refresh. |
| MST-004 | Partial | Main `config.spec.ts` TC-M-055/056 | Create is covered; update, duplicate validation, and confirmed deletion are not. |
| MST-005 | Partial | Main `products.spec.ts` TC-M-016–019 and UX-MASTER-01/02 | Creation/search workspace is covered; edit persistence, uniqueness conflicts, and price reconciliation are incomplete. |
| MST-006 | Partial | Main `products.spec.ts` UX-MASTER-02 | Image control is present; valid/invalid upload, replacement, deletion, and R2 cleanup are not automated. |
| MST-007 | Partial | Main `products.spec.ts` UX-MASTER-02 | History panel/empty state is covered, not ordered supplier/currency/source data. |
| MST-008 | Partial | Main `customers.spec.ts` TC-M-012–015; `sales-cycle.spec.ts` TC-W-001 | Create/validation/list are covered; edit/delete/search/dependency errors are incomplete. |
| MST-009 | Partial | Main `purchasing.spec.ts` TC-M-032; `purchase-cycle.spec.ts` TC-1.9.3 | List/create are covered; full CRUD/search/tenant isolation are not. |
| MST-010 | Partial | Main `inventory.spec.ts` TC-M-034/035; sales fixture creation | List/create usage is covered; inactive lifecycle and history behavior are not. |
| MST-011 | Partial | Main `config.spec.ts` TC-M-054 | Page load only; rule persistence and calculations are not exercised. |
| MST-012 | Missing | None | Scoped sequential numbering and concurrent uniqueness are not automated. |
| MST-013 | Missing | Responsive route checks only | Employee/consultant CRUD, classification, search, and tenant scope are not exercised. |
| MST-014 | Partial | `project-relationship-authorization.spec.ts`; `projects-cross-tenant.spec.ts` | Project-party relationship authorization is covered; the full relationship lifecycle/UI policy is incomplete. |

## Sales

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| SAL-001 | Partial | `sales-cycle.spec.ts` TC-1.5.1.1/1.5.1.5; `sales.spec.ts` | Create/header/line flow is covered; totals, rounding, currency, numbering, and persisted reconciliation are incomplete. |
| SAL-002 | Missing | None | Draft edit, safe cancel, and confirmed delete are not automated. |
| SAL-003 | Partial | `sales-cycle.spec.ts` TC-1.5.3.1 and UX-TRADE-04 | Shipment creation/UI is covered; partial/final stock movements and over-shipment are not reconciled. |
| SAL-004 | Partial | `sales-cycle.spec.ts` TC-1.5.2.1/1.5.2.2 and UX-TRADE-02 | Manual creation/validation is covered; totals/status/immutable conflict are incomplete. |
| SAL-005 | Missing | None | Source-quantity eligibility, traceability, and duplicate billing prevention are not automated. |
| SAL-006 | Partial | `sales-cycle.spec.ts` payment tests | Payment list/allocation entry is covered; paid balance and ledger effects are not reconciled. |
| SAL-007 | Partial | `sales-cycle.spec.ts` UX-TRADE-05 | Over-allocation preview is covered; partial and valid multi-allocation outcomes are not. |
| SAL-008 | Missing | None | Concurrent edit conflict and recovery are not automated. |
| SAL-009 | Missing | None | Search/filter/sort/page/export equivalence is not automated. |

## Purchasing

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| PUR-001 | Partial | `purchase-cycle.spec.ts` TC-1.6.1.1/1.6.1.2; `purchasing.spec.ts` | Create/header/line flow is covered; totals, currency, and persisted reconciliation are incomplete. |
| PUR-002 | Missing | None | Draft edit/cancel/delete is not automated. |
| PUR-003 | Partial | `purchase-cycle.spec.ts` TC-1.6.2.1/1.6.2.1b and UX-TRADE-04 | Receipt creation/post UI is covered; partial/final inventory and excess prevention are not reconciled. |
| PUR-004 | Partial | `purchase-cycle.spec.ts` TC-1.6.3.1/1.6.3.2 | Manual creation/validation is covered; totals/status/immutable conflict are incomplete. |
| PUR-005 | Missing | None | Source eligibility, traceability, and duplicate invoicing are not automated. |
| PUR-006 | Partial | `purchase-cycle.spec.ts` UX-TRADE-05; payment page smoke | Over-allocation preview is covered; balances, valid allocation, and ledger effects are not. |
| PUR-007 | Missing | None | Concurrent purchase edit conflict/recovery is not automated. |
| PUR-008 | Missing | None | Search/filter/sort/page/export equivalence is not automated. |

## Inventory

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| INV-001 | Full | `inventory-lifecycle.spec.ts` INV-001/002/007/011 | Draft has no effect; completion posts one exact, traceable movement and balance delta; non-Draft mutation is rejected. |
| INV-002 | Full | `inventory-lifecycle.spec.ts` INV-001/002/007/011 | Draft cancellation has no movement; completed cancellation preserves and compensates history once; repeated cancellation is idempotent. |
| INV-003 | Full | `inventory-lifecycle.spec.ts` INV-003/004/007/011 | One count covers match, gain, and loss; only non-zero variances post and all three balances reconcile. |
| INV-004 | Full | `inventory-lifecycle.spec.ts` INV-003/004/007/011 | Draft cancellation has no effect and completed cancellation restores stock with paired auditable movements. |
| INV-005 | Full | `inventory-lifecycle.spec.ts` INV-005/006/007/011 | Completion posts balanced source/destination legs once and reconciles both warehouse balances. |
| INV-006 | Full | `inventory-lifecycle.spec.ts` INV-005/006/007/011 | Excess quantity returns causal 409 with no movement; valid completion and cancellation compensate both sides exactly. |
| INV-007 | Full | `inventory-lifecycle.spec.ts` INV-001–007/011 | Draft line update/delete and document delete succeed; completed/cancelled line/document mutations return 409 without changing balances or history. |
| INV-008 | Missing | Responsive route coverage only | Valuation, currency, totals, and export reconciliation are not exercised. |
| INV-009 | Missing | None | Balance-to-ledger variance and movement audit are not automated. |
| INV-010 | Missing | None | Reorder-gap result accuracy is not automated. |
| INV-011 | Full | `inventory-lifecycle.spec.ts` INV-001–007/011 | Adjustment, count, and transfer signed deltas reconcile to opening/final balances, including cancellation compensation. |

## Finance

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| FIN-001 | Partial | `finance-workflow.spec.ts` TC-1.8.1.1–1.8.1.3 | List/create/empty-code validation are covered; update/delete/invariants/dependencies are not. |
| FIN-002 | Partial | `finance-workflow.spec.ts` TC-1.8.2.1–1.8.2.3 | List/create/required code are covered; calendar agreement, overlap, and status lifecycle are not. |
| FIN-003 | Partial | `finance-workflow.spec.ts` journal-page controls | Posting UI is covered; balanced/unbalanced journal posting and account balances are not. |
| FIN-004 | Missing | None | Closed/uncovered-period posting controls are not automated. |
| FIN-005 | Partial | `finance-workflow.spec.ts` TC-1.8.3.2/.3/.5 | Disabled prerequisites are covered; successful balanced posting/source linkage/deduplication are not. |
| FIN-006 | Partial | `finance-workflow.spec.ts` TC-1.8.4 | Disabled reversal prerequisites are covered; successful/invalid/single-use reversal is not. |
| FIN-007 | Partial | `dashboard.spec.ts` UX-DASH-01–03 and TC-M-006–009 | Dashboard data presentation/retry is covered; reconciliation to reports is not. |
| FIN-008 | Missing | Reports route smoke only | Trial-balance calculation, balance, scope, and export are not automated. |
| FIN-009 | Missing | Reports route smoke only | P&L signs, subtotals, comparison, drill-down, and export are not automated. |
| FIN-010 | Missing | Reports route smoke only | Balance Sheet equation, drill-down, and journal trace are not automated. |
| FIN-011 | Missing | Dashboard aging presentation only | Due-date buckets, outstanding balances, currency separation, and export are not reconciled. |
| FIN-012 | Missing | Dashboard targeted failure states only | Report no-data and date-boundary rules are not automated. |
| FIN-013 | Partial | `finance.spec.ts` TC-M-046/047; `permissions.spec.ts` TC-4.1.5 | Page/list access is covered; action completeness, actor/tenant/trace accuracy, and secret absence are not. |

## Projects

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| PRJ-001 | Partial | `project-documents.spec.ts` and cross-tenant fixtures create categories through API | Dedicated category UI CRUD/validation is not covered. |
| PRJ-002 | Partial | `projects-cross-tenant.spec.ts`; document fixture project creation | Create/link behavior is covered; edit and list/detail consistency are not complete. |
| PRJ-003 | Partial | `project-documents.spec.ts` | Valid private upload and byte-identical preview/download are covered; invalid upload reasons are not in this workflow. |
| PRJ-004 | Partial | `project-documents.spec.ts` | Version ordering/history/download are covered; folder path and search are not. |
| PRJ-005 | Missing | None | Signed-link expiry and anonymous/write rejection are not automated. |
| PRJ-006 | Partial | `project-documents.spec.ts`; project cleanup paths | Document deletion/storage usage is verified; project cascade cleanup and cancel behavior are not fully asserted. |
| PRJ-007 | Partial | `project-relationship-authorization.spec.ts`; `projects-cross-tenant.spec.ts` | Relationship/project-party access is covered; the complete granular module/API matrix is not. |

## Imports

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| IMP-001 | Partial | `imports.spec.ts` template download | Customer template validity is covered; every advertised import type/template is not enumerated. |
| IMP-002 | Full | `imports.spec.ts` TC-M-059 | Real validate, preview, submit, history, and created-customer outcome are asserted. |
| IMP-003 | Full | `imports.spec.ts` TC-M-059 | Invalid row/field issue, correction, revalidation, and successful submit are asserted. |
| IMP-004 | Full | `generated-documents.spec.ts` | Generate, history, preview, download, regenerate, versions, and cleanup are asserted. |

## POS

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| POS-001 | Partial | `shift-workflows.spec.ts` TC-2.1.1/.2 | Open and refresh persistence are covered; relogin and duplicate-context persistence are not. |
| POS-002 | Missing | None | Duplicate shift and invalid opening input are not automated. |
| POS-003 | Partial | `cart.spec.ts`; `ux-pos-07.acceptance.spec.ts` | Add/increment and valid scan are covered; real search and unknown-scan feedback are incomplete. |
| POS-004 | Partial | `cart.spec.ts` TC-P-010–014; mobile cart test | Quantity/total/remove are covered; discount validation is incomplete and Clear Cart remains skipped. |
| POS-005 | Partial | `customer.spec.ts` TC-P-018/019 | Selection and empty-name validation are covered; successful quick creation/automatic selection are not. |
| POS-006 | Partial | Cashier journey, checkout workflow, retry test | Real checkout/receipt/invoice/stock behavior is covered in parts; full totals/tax/discount/accounting reconciliation is not. |
| POS-007 | Partial | `checkout-workflows.spec.ts` card checkout; shift summary UI | Card checkout succeeds; payment reference persistence, mixed payment, and reconciliation are incomplete. |
| POS-008 | Full | `refund.spec.ts` POS-01B | Same idempotency key/request is retried; one invoice, one stock effect, one receipt, and replay result are asserted. |
| POS-009 | Partial | `checkout-workflows.spec.ts` TC-2.2.5 | The current test is conditional and does not reliably force/assert a backend stock conflict and cart recovery. |
| POS-010 | Full | `ux-pos-07.acceptance.spec.ts`; POS-01B retry scenario | Offline status/checkout blocking/recovery and unknown-outcome retry safety are asserted. |
| POS-011 | Partial | Receipt dismissal, history panel, print popup tests | View/print/history are covered; identical reprint contents and no-mutation behavior are not. |
| POS-012 | Missing | None | A real full refund with complete stock/finance/shift reversal is not automated. |
| POS-013 | Partial | `refund.spec.ts` TC-2.4.5 | Atomic partial refund, retry, invoice totals, and stock are asserted; cumulative over-refund rejection is not. |
| POS-014 | Partial | Refund button shift guard and permission-oriented UI tests | Authorized visibility is covered; a truly unauthorized identity/API denial and audit are not. |
| POS-015 | Partial | `shift-workflows.spec.ts` TC-2.1.3/.5.1 | Close/variance/new-shift requirement UI is covered; persisted reconciliation accuracy is not queried afterward. |
| POS-016 | Partial | POS responsive `/admin` route and protected auth basics | Role changes and unauthorized API/data boundaries are not fully exercised. |
| POS-017 | Missing | None | Timeout warning, continue-session, and terminal expiry are not automated. |
| POS-018 | Partial | POS responsive suite, mobile cart, `ux-pos-07.acceptance.spec.ts` | Widths/touch targets/overflow are covered; zoom remains skipped and complete dialog/live-region accessibility is incomplete. |

## Security

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| SEC-001 | Partial | Main `permissions.spec.ts`; project cross-tenant authorization tests | Selected wrong-tenant/project boundaries are covered; systematic object read/update/delete denial and audit are not. |
| SEC-002 | Missing | None | Stored/reflected script and exported-formula injection are not automated. |
| SEC-003 | Missing | None | Authentication/sensitive endpoint throttling and recovery are not automated. |
| SEC-004 | Missing | None | Production security headers and allowed/disallowed CORS origin matrix are not automated. |
| SEC-005 | Partial | `project-documents.spec.ts`; product UI; storage threshold suite | Private document flow/public image presentation is covered in parts; direct list/write/delete denial and signed-link expiry are not. |

## Operations

| Excel ID | Coverage | Playwright evidence | Remaining gap |
|---|---|---|---|
| OPS-001 | Missing | None | Loki/Cloud Run correlation, severity, causality, and secret-redaction are not automated. |
| OPS-002 | Missing | None | Cold-start timing and readiness dependency behavior are not automated. |
| OPS-003 | Missing | None | Migration paths, bootstrap idempotency, and startup read-only/current-schema gates are not Playwright coverage. |
| OPS-004 | Missing | None | Rollback/forward-fix and revision/traffic evidence are not automated. |
| OPS-005 | Partial | Responsive suites and selected error-boundary assertions | No suite-wide console, failed-resource, mixed-content, CSP, and CORS failure collector exists. |
| OPS-006 | Partial | POS checkout/refund idempotency; project upload uncertainty; selected concurrency guards | Safeguards are covered for selected workflows, not all critical actions. |
| OPS-007 | Missing | None | Commit/revision gate aggregation, defect status, evidence, and sign-off are not automated. |

## P0 automation backlog

Implement one independently reviewable workflow at a time in this order:

1. **P0-AUTO-01 — Inventory lifecycle and reconciliation — completed 16 November 2026**  
   INV-001 through INV-007 and INV-011 now use real completion/cancellation, movement, balance, immutability, insufficient-stock, and duplicate-effect assertions in an isolated automation tenant.
2. **P0-AUTO-02 — Financial posting and reports**  
   Cover FIN-003 through FIN-006 and FIN-008 through FIN-011 with seeded journals and explicit accounting reconciliation.
3. **P0-AUTO-03 — Trade source, concurrency, and persistence**  
   Cover SAL-001/003–008 and PUR-001/003–007, including source quantities, immutable states, concurrency, allocation, inventory, and ledger effects.
4. **P0-AUTO-04 — POS full refund and hard stock conflict**  
   Cover POS-012 and replace the conditional POS-009 test with a guaranteed conflict plus recovery assertions.
5. **P0-AUTO-05 — Project signed-link security and cleanup**  
   Cover PRJ-005 and finish PRJ-003/006 invalid-upload, expiry, anonymous/write denial, and project cascade cleanup.
6. **P0-AUTO-06 — Cross-cutting security**  
   Cover SEC-001/002/004/005 with an explicit tenant/object matrix, injection payloads, CORS/header checks, and storage access checks.
7. **P0-AUTO-07 — Release gates outside Playwright**  
   Implement FND-001 and OPS-002/003/004/007 in deployment/integration scripts rather than forcing them into browser tests.

## Traceability convention for new tests

- Put the Excel ID at the beginning of the Playwright title, for example: `test('INV-001: completing an adjustment posts exact movements once', ...)`.
- When one test supports multiple cases, annotate the secondary IDs directly above the test and keep one primary ID in the title.
- Do not reuse old `TC-M-*`, `TC-A-*`, or `TC-P-*` identifiers for new work. Existing identifiers remain historical aliases until their tests are renamed in focused changes.
- A test may move a case to Full only when every material expected result in the Excel row is asserted or intentionally delegated to a named non-Playwright gate.
