# Migration + Document Generation Checklist (Pre-CD Phase)

## Goal
Build two foundation capabilities before deployment/CD hardening:

1. Data migration via Excel import (template -> validate -> submit)
2. Business document generation/export (DOCX/PDF) with Azure Blob persistence

---

## Feasibility Review

### What is already in the codebase
- [x] CQRS/Mediator pattern is established (`Command`, `Query`, `Handler` + service layer)
- [x] Azure Blob integration already exists for product images (`Azure.Storage.Blobs` + storage service abstraction)
- [x] Configuration section already exists in main UI (`/config/*`) and can host an import center
- [x] Core business entities already have contracts/services that can be reused for mapping and validation

### What is missing
- [ ] Generic import framework (template builder, parser, validator, row-level error report writer)
- [ ] Import endpoints and UI flow per object (customer, supplier, product, SO, PO, etc.)
- [ ] Document template engine (DOCX placeholders) and PDF rendering pipeline
- [ ] Document metadata persistence (status, storage path, checksum, version)
- [ ] Generic blob document storage service (parallel to product image storage)

### Conclusion
- [x] Feature is feasible with current architecture
- [x] Best-fit implementation is a generic pipeline + object-specific adapters
- [x] Should be implemented before CD because it affects data onboarding and audit/operational workflows

---

## Track A: Data Migration (Excel Import)

## A0. Architecture & Standards
- [ ] Define supported entities for wave 1: Customer, Supplier, Product, SalesOrder, PurchaseOrder
- [ ] Define import mode per entity: `upsert`, `insert-only`, `update-only`
- [ ] Define required columns, business keys, FK resolution strategy, and idempotency behavior
- [ ] Define max file size, row limits, and tenant isolation rules
- [ ] Define import job status model: `Draft`, `Validated`, `FailedValidation`, `Imported`, `ImportFailed`

## A1. Generic Backend Framework (CQRS-first)
- [x] Create `ImportJob` domain model + EF configuration + migration
- [x] Create generic contracts:
  - [x] `DownloadImportTemplateQuery`
  - [x] `ValidateImportFileCommand`
  - [x] `SubmitImportJobCommand`
  - [x] `GetImportJobStatusQuery`
- [ ] Build `IImportDefinition<T>` abstraction (column map, parser, validators, row mapper)
- [x] Build Excel reader/writer service (template + annotated error workbook)
- [x] Build reusable validation engine:
  - [x] schema validation
  - [x] type conversion validation
  - [x] reference existence validation
  - [x] business rule validation
- [x] Build import executor service with transaction batching and detailed per-row result logging

## A2. Object Adapters (Wave 1)
- [x] Customer import definition + mapping + validators
- [x] Supplier import definition + mapping + validators
- [x] Product import definition + mapping + validators
- [x] Sales Order import definition + mapping + validators
- [x] Purchase Order import definition + mapping + validators

## A3. API Surface
- [x] Add import controller endpoints (under configuration scope)
- [x] Add endpoint to list available import types + template metadata
- [x] Add endpoint to download template per import type
- [x] Add endpoint to upload/validate file and return annotated error workbook when invalid
- [x] Add endpoint to submit validated job
- [x] Add endpoint to query import history/status/detail

## A4. Main UI (Configuration -> Import Data)
- [x] Add new menu item `/config/import-data`
- [x] Build Import Data landing page with entity list/cards
- [x] Build per-entity import page with:
  - [x] Download template button
  - [x] Upload file section
  - [x] Validate button
  - [x] Validation result summary (rows ok/error)
  - [x] Download error workbook button
  - [x] Submit import button (enabled only after valid)
- [x] Build import history panel with status + timestamps + initiator

## A5. Security, Audit, and Reliability
- [x] Add permission scopes for import validate/submit/view history
- [x] Add audit logs for validation and submit events
- [x] Add duplicate submit guard (idempotency token/job lock)
- [x] Add server-side throttling/limits for large files

## A6. Testing
- [ ] Unit tests for parser/validator/mappers
- [ ] Handler tests for all import commands/queries
- [x] Web integration tests for API endpoints
- [x] UI tests for happy path + validation failure path
- [x] E2E test: template download -> invalid upload -> error workbook -> corrected upload -> submit success

---

## Track B: Document Creation (SO/PO/Invoice/Payment)

## B0. Architecture & Standards
- [x] Define document types for wave 1:
  - [x] Sales Order
  - [x] Purchase Order
  - [x] Sales Invoice
  - [x] Purchase Invoice
  - [x] Customer Payment Receipt
  - [x] Vendor Payment Receipt
- [x] Define format options: DOCX and PDF
- [x] Define template versioning strategy per document type
- [x] Define regeneration rules (when to reuse stored document vs regenerate)

## B1. Generic Backend Framework (CQRS-first)
- [x] Create `GeneratedDocument` domain model + EF configuration + migration
- [x] Add document storage abstraction:
  - [x] `IDocumentStorageService`
  - [x] `AzureBlobDocumentStorageService`
- [x] Add generic commands/queries:
  - [x] `GenerateDocumentCommand`
  - [x] `GetDocumentDownloadLinkQuery`
  - [x] `RegenerateDocumentCommand`
- [x] Add renderer pipeline:
  - [x] DOCX renderer (placeholder merge)
  - [x] PDF renderer (from canonical template model)
- [x] Add checksum/hash for deterministic cache/reuse

## B2. Template Authoring (Internal Templates)
- [x] Create default templates for each wave-1 type (DOCX)
- [x] Map template placeholders to canonical data model
- [x] Define header/footer, company identity block, totals/tax sections
- [x] Define localization-ready date/currency formatting

## B3. API Surface
- [x] Add endpoint: generate document by type + entity id + format
- [x] Add endpoint: download existing document
- [x] Add endpoint: list generated documents per source entity
- [x] Add endpoint: regenerate document (admin/privileged)
- [x] Add endpoint: stream document content inline (for viewer; returns raw bytes with Content-Disposition: inline)
- [x] Add endpoint: get PDF preview of a DOCX document (server-side render to PDF for in-browser viewing)

## B4. Main UI Integration
- [x] Add Export button on SO/PO/Invoice/Payment pages
- [x] Add format selector (DOCX/PDF)
- [x] Add generated-document history panel per record
- [x] Add download/re-generate actions based on permission
- [x] Add inline document viewer panel (PDF rendered in-browser via PDF.js / iframe)
- [x] DOCX format: show Preview as PDF button (calls server-side PDF preview endpoint)
- [x] Viewer supports zoom, page navigation, and full-screen mode
- [x] Add permission guard on viewer (requires documents.view or documents.download permission)

## B5. Security, Audit, and Reliability
- [x] Add permission scopes for generate/view/download/regenerate
- [ ] Store tenant-scoped blob paths and metadata only (no public blobs)
- [x] Add signed URL strategy (short-lived links, used by viewer to stream from blob directly)
- [x] Add audit logs for generation/download
- [x] Inline viewer must use short-lived signed URL — never expose permanent blob URL to client
- [x] Add documents.view permission scope (read-only viewer without download capability)

## A6. Testing
- [x] Unit tests for parser/validator/mappers
- [x] Handler tests for all import commands/queries
- [ ] Blob integration tests (mock + optional real container)
- [ ] Web tests for endpoints and permission behavior
- [ ] E2E tests from UI export to successful download
- [ ] E2E test: generate -> open viewer -> verify PDF renders inline
- [ ] E2E test: DOCX preview endpoint returns valid PDF bytes
- [ ] Permission test: viewer blocked without documents.view or documents.download

---

## Cross-Cutting Delivery Plan

## Phase 1 (MVP backbone)
- [ ] A0-A1 complete
- [ ] B0-B1 complete

## Phase 2 (Wave 1 entities + docs)
- [ ] A2-A4 complete for Customer/Supplier/Product/SO/PO
- [ ] B2-B4 complete for SO/PO/Invoice/Payment

## Phase 3 (Hardening)
- [ ] A5-A6 complete
- [ ] B5-B6 complete

## Phase 4 (Ready for CD)
- [ ] Add runbooks + rollback notes
- [ ] Add migration/import operational documentation
- [ ] Add document generation operational documentation
- [ ] Confirm all CI tests green and coverage thresholds met

---

## Open Decisions (Need Product Sign-off)
- [x] Do imports allow update of existing posted/approved documents?
  Decision: No. Posted/approved transactional documents are immutable through import. Master data can be updated via upsert.
- [x] Should validation allow partial success or enforce all-or-nothing submit?
  Decision: All-or-nothing submit for each import job. Validation can report mixed row outcomes, but submit is blocked until all rows are valid.
- [x] For PDF generation: direct template or DOCX->PDF conversion pipeline?
  Decision: Use canonical document model -> DOCX renderer and canonical document model -> PDF renderer (no DOCX->PDF conversion dependency).
- [x] Should generated docs be immutable after posting/approval?
  Decision: Yes. Posted/approved source documents keep immutable generated artifacts; re-generation creates a new version.
- [x] Retention policy for generated files in Blob storage?
  Decision: Keep active versions indefinitely by default; allow lifecycle cleanup only for superseded versions after 365 days.
- [x] Document viewer strategy: render PDF inline or require download for DOCX?
  Decision: PDF renders in-browser. DOCX uses a server-side PDF preview endpoint backed by the canonical document model renderer, avoiding client-side DOCX parsing and preserving rendering fidelity.
- [x] Separate view vs download permission?
  Decision: Separate permissions are enabled. Viewer endpoints accept documents.view or documents.download, while file-download link resolution remains gated by documents.download.

---

## Status
- [x] Planning approved
- [x] Implementation started
- [ ] Ready for deployment/CD phase

---

## Sprint-Ready Backlog (P0/P1/P2)

Legend:
- `Est` = engineering effort in ideal dev-days
- `Owner` = primary lane (`BE`, `UI`, `QA`)
- `Depends On` = blocking work item IDs

### P0 (Foundation - must complete first)

| ID | Task | Est | Owner | Depends On |
|---|---|---:|---|---|
| P0-1 | [x] Finalize import and document architecture decisions in Open Decisions section | 1 | BE | - |
| P0-2 | [x] Add `ImportJob` model, EF configuration, migration | 2 | BE | P0-1 |
| P0-3 | [x] Add `GeneratedDocument` model, EF configuration, migration | 2 | BE | P0-1 |
| P0-4 | [x] Build generic import contracts/handlers (`DownloadTemplate`, `Validate`, `Submit`, `Status`) | 4 | BE | P0-2 |
| P0-5 | [x] Build Excel template + parser + annotated error workbook services | 4 | BE | P0-2 |
| P0-6 | [x] Build validation engine (schema/type/reference/business rules) | 4 | BE | P0-4, P0-5 |
| P0-7 | [x] Add document storage abstraction + Azure Blob implementation for documents | 3 | BE | P0-3 |
| P0-8 | [x] Build generic document commands/handlers (`Generate`, `DownloadLink`, `Regenerate`) | 3 | BE | P0-3, P0-7 |
| P0-9 | [x] Implement DOCX and PDF renderer pipeline baseline | 5 | BE | P0-8 |
| P0-10 | [x] Add permission scopes and audit hooks for import/document operations | 3 | BE | P0-4, P0-8 |
| P0-11 | Create base QA harness: API integration test scaffolds for import/document flows | 2 | QA | P0-4, P0-8 |

### P1 (Wave 1 business coverage)

| ID | Task | Est | Owner | Depends On |
|---|---|---:|---|---|
| P1-1 | Implement import adapters: Customer, Supplier, Product | 4 | BE | P0-6 |
| P1-2 | Implement import adapters: Sales Order, Purchase Order | 4 | BE | P0-6 |
| P1-3 | Add import API controller endpoints + history/query endpoints | 3 | BE | P1-1, P1-2 |
| P1-4 | Build UI route and landing page: `/config/import-data` | 2 | UI | P1-3 |
| P1-5 | Build per-entity UI workflow: download/upload/validate/submit/error file | 5 | UI | P1-4 |
| P1-6 | Create DOCX templates for SO/PO/Invoices/Payment receipts | 3 | BE | P0-9 |
| P1-7 | Add document generation/download/list APIs per source entity | 3 | BE | P1-6 |
| P1-8 | Add UI export controls on SO/PO/Invoice/Payment pages + format selector | 3 | UI | P1-7 |
| P1-9 | Add generated-document history panel + re-generate action in UI | 2 | UI | P1-8 |
| P1-10 | QA functional coverage for Wave 1 happy path + major failure path | 4 | QA | P1-5, P1-9 |

### P2 (Hardening + release readiness)

| ID | Task | Est | Owner | Depends On |
|---|---|---:|---|---|
| P2-1 | Add idempotency lock and duplicate submit protection for imports | 2 | BE | P1-3 |
| P2-2 | Add server-side file size/row throttling + resilience limits | 2 | BE | P1-3 |
| P2-3 | Add signed URL policy + retention policy enforcement for documents | 2 | BE | P1-7 |
| P2-4 | Expand unit tests (mappers/validators/renderers) to target coverage | 4 | BE | P1-2, P1-7 |
| P2-5 | Add end-to-end scenario tests (import correction loop, export/download loop) | 4 | QA | P1-10 |
| P2-6 | Add runbooks, rollback notes, and operator documentation | 2 | BE | P2-1, P2-3 |
| P2-7 | Final regression pass and CI gate validation for CD readiness | 2 | QA | P2-4, P2-5 |

---

## Suggested Sprint Sequence (Starting 4 May 2026)

Assuming 2-week sprints and parallel BE/UI/QA lanes:

- Sprint 1 (4 May - 17 May): Complete P0-1 through P0-8
- Sprint 2 (18 May - 31 May): Complete P0-9 through P1-5
- Sprint 3 (1 Jun - 14 Jun): Complete P1-6 through P1-10
- Sprint 4 (15 Jun - 28 Jun): Complete P2-1 through P2-7 and CD readiness gate

---

## Owner Lanes

### Backend (BE)
- Domain models/migrations
- CQRS handlers/contracts
- Validation/import executor
- Document rendering and blob persistence
- Security/audit/idempotency/throttling

### UI
- Import Data pages and workflow screens
- Export and document history UX on transaction pages
- Frontend permission gating and user feedback states

### QA
- API integration suites
- UI flow validation
- End-to-end scenarios and release gate verification

---

## Sprint Exit Criteria

- P0 exit: Generic import and document backbones are deployable in lower environments
- P1 exit: Wave 1 entities can be imported and exported from UI end-to-end
- P2 exit: Reliability, security, tests, and runbooks are complete for CD handoff
