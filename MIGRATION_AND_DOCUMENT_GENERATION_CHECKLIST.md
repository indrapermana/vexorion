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
- [ ] Create `ImportJob` domain model + EF configuration + migration
- [ ] Create generic contracts:
  - [ ] `DownloadImportTemplateQuery`
  - [ ] `ValidateImportFileCommand`
  - [ ] `SubmitImportJobCommand`
  - [ ] `GetImportJobStatusQuery`
- [ ] Build `IImportDefinition<T>` abstraction (column map, parser, validators, row mapper)
- [ ] Build Excel reader/writer service (template + annotated error workbook)
- [ ] Build reusable validation engine:
  - [ ] schema validation
  - [ ] type conversion validation
  - [ ] reference existence validation
  - [ ] business rule validation
- [ ] Build import executor service with transaction batching and detailed per-row result logging

## A2. Object Adapters (Wave 1)
- [ ] Customer import definition + mapping + validators
- [ ] Supplier import definition + mapping + validators
- [ ] Product import definition + mapping + validators
- [ ] Sales Order import definition + mapping + validators
- [ ] Purchase Order import definition + mapping + validators

## A3. API Surface
- [ ] Add import controller endpoints (under configuration scope)
- [ ] Add endpoint to list available import types + template metadata
- [ ] Add endpoint to download template per import type
- [ ] Add endpoint to upload/validate file and return annotated error workbook when invalid
- [ ] Add endpoint to submit validated job
- [ ] Add endpoint to query import history/status/detail

## A4. Main UI (Configuration -> Import Data)
- [ ] Add new menu item `/config/import-data`
- [ ] Build Import Data landing page with entity list/cards
- [ ] Build per-entity import page with:
  - [ ] Download template button
  - [ ] Upload file section
  - [ ] Validate button
  - [ ] Validation result summary (rows ok/error)
  - [ ] Download error workbook button
  - [ ] Submit import button (enabled only after valid)
- [ ] Build import history panel with status + timestamps + initiator

## A5. Security, Audit, and Reliability
- [ ] Add permission scopes for import validate/submit/view history
- [ ] Add audit logs for validation and submit events
- [ ] Add duplicate submit guard (idempotency token/job lock)
- [ ] Add server-side throttling/limits for large files

## A6. Testing
- [ ] Unit tests for parser/validator/mappers
- [ ] Handler tests for all import commands/queries
- [ ] Web integration tests for API endpoints
- [ ] UI tests for happy path + validation failure path
- [ ] E2E test: template download -> invalid upload -> error workbook -> corrected upload -> submit success

---

## Track B: Document Creation (SO/PO/Invoice/Payment)

## B0. Architecture & Standards
- [ ] Define document types for wave 1:
  - [ ] Sales Order
  - [ ] Purchase Order
  - [ ] Sales Invoice
  - [ ] Purchase Invoice
  - [ ] Customer Payment Receipt
  - [ ] Vendor Payment Receipt
- [ ] Define format options: DOCX and PDF
- [ ] Define template versioning strategy per document type
- [ ] Define regeneration rules (when to reuse stored document vs regenerate)

## B1. Generic Backend Framework (CQRS-first)
- [ ] Create `GeneratedDocument` domain model + EF configuration + migration
- [ ] Add document storage abstraction:
  - [ ] `IDocumentStorageService`
  - [ ] `AzureBlobDocumentStorageService`
- [ ] Add generic commands/queries:
  - [ ] `GenerateDocumentCommand`
  - [ ] `GetDocumentDownloadLinkQuery`
  - [ ] `RegenerateDocumentCommand`
- [ ] Add renderer pipeline:
  - [ ] DOCX renderer (placeholder merge)
  - [ ] PDF renderer (from canonical template model)
- [ ] Add checksum/hash for deterministic cache/reuse

## B2. Template Authoring (Internal Templates)
- [ ] Create default templates for each wave-1 type (DOCX)
- [ ] Map template placeholders to canonical data model
- [ ] Define header/footer, company identity block, totals/tax sections
- [ ] Define localization-ready date/currency formatting

## B3. API Surface
- [ ] Add endpoint: generate document by type + entity id + format
- [ ] Add endpoint: download existing document
- [ ] Add endpoint: list generated documents per source entity
- [ ] Add endpoint: regenerate document (admin/privileged)

## B4. Main UI Integration
- [ ] Add Export button on SO/PO/Invoice/Payment pages
- [ ] Add format selector (DOCX/PDF)
- [ ] Add generated-document history panel per record
- [ ] Add download/re-generate actions based on permission

## B5. Security, Audit, and Reliability
- [ ] Add permission scopes for generate/download/regenerate
- [ ] Store tenant-scoped blob paths and metadata only (no public blobs)
- [ ] Add signed URL strategy (short-lived links)
- [ ] Add audit logs for generation/download

## B6. Testing
- [ ] Unit tests for data mappers and renderers
- [ ] Handler tests for generation/download/reuse logic
- [ ] Blob integration tests (mock + optional real container)
- [ ] Web tests for endpoints and permission behavior
- [ ] E2E tests from UI export to successful download

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
- [ ] Do imports allow update of existing posted/approved documents?
- [ ] Should validation allow partial success or enforce all-or-nothing submit?
- [ ] For PDF generation: direct template or DOCX->PDF conversion pipeline?
- [ ] Should generated docs be immutable after posting/approval?
- [ ] Retention policy for generated files in Blob storage?

---

## Status
- [ ] Planning approved
- [ ] Implementation started
- [ ] Ready for deployment/CD phase
