# Milestone C Checklist

This checklist breaks Milestone C (Phase 3: Commercial document layer) into concrete repo tasks.

## Scope

- Sales invoices
- Purchase invoices
- Billing UI

## Backend domain and persistence

- [x] Add `SalesInvoice` model with totals, due fields, status, posting metadata, and source refs
- [x] Add `SalesInvoiceLine` model and parent total recalculation rules
- [x] Add `PurchaseInvoice` model with totals, due fields, status, posting metadata, and source refs
- [x] Add `PurchaseInvoiceLine` model and parent total recalculation rules
- [x] Add `PaymentTerm` model
- [x] Add `TaxCode` model
- [x] Add `DbSet` registrations in `AppDbContext`
- [x] Add EF Core configurations and indexes (tenant+number, tenant+partner+date)
- [x] Create EF migration for Milestone C entities

## Contracts and API

- [x] Add Sales invoice request/response DTOs in `Contracts/Sales/Invoices`
- [x] Add Purchase invoice request/response DTOs in `Contracts/Purchasing/Invoices`
- [x] Add customer payment DTOs in `Contracts/Sales/Payments`
- [x] Add vendor payment DTOs in `Contracts/Purchasing/Payments`
- [x] Add SalesInvoicesController and SalesInvoiceLinesController
- [x] Add PurchaseInvoicesController and PurchaseInvoiceLinesController

## Application services

- [x] Add `ISalesInvoiceCommandService` and `ISalesInvoiceQueryService`
- [x] Add `ISalesInvoiceLineCommandService`
- [x] Add `IPurchaseInvoiceCommandService` and `IPurchaseInvoiceQueryService`
- [x] Add `IPurchaseInvoiceLineCommandService`
- [x] Register all new services in DI
- [x] Enforce draft-only edits/deletes and posted-document immutability

## Business rules

- [x] Implement invoice total calculation (subtotal, tax, grand total)
- [x] Implement due date derivation from payment terms
- [x] Implement payment allocation updates for balance due
- [x] Block over-allocation
- [x] Add creation flow from source docs (sales order -> sales invoice)
- [x] Add creation flow from source docs (purchase order -> purchase invoice)

## Tests

- [x] Add service tests for invoice total calculation
- [x] Add service tests for due date calculation from payment terms
- [x] Add service tests for payment allocation updates
- [x] Add service tests for over-allocation rejection
- [x] Add service tests for posted invoice edit blocking
- [x] Add web tests for authorization (View/Manage permissions)
- [x] Add web tests for model validation

## Frontend implementation

- [x] Add `salesInvoices` feature page and route
- [x] Add `purchaseInvoices` feature page and route
- [x] Add create/edit/delete dialogs for invoices and lines
- [x] Add source-document action buttons to create invoices
- [x] Add navigation entries under Sales/Purchasing

## Suggested implementation order

1. Models + EF configurations + migration
2. DTO contracts
3. Command/query services and line command services
4. Controllers and auth policies
5. Service and web tests
6. Frontend pages, routes, and source-document actions

## Milestone C Status

- [x] COMPLETE — Invoice services, source-order creation flows, service/web tests, and frontend invoice pages/actions are implemented
