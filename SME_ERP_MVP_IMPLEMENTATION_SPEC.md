# SME ERP MVP Implementation Spec

This document turns the current VexorionERP codebase into a concrete implementation roadmap for a full SME ERP MVP.

It is intentionally scoped to the existing architecture:

- ASP.NET Core Web API in `VexorionERP`
- EF Core persistence in `VexorionERP.Database`
- domain entities in `VexorionERP.Models`
- CQRS-style application services in `VexorionERP.Services`
- request/response contracts in `VexorionERP.Contracts`
- React + Vite + MUI frontend in `VexorionERP.UI`

The goal is not to redesign the system. The goal is to extend the current patterns until the product can support a small or medium business across sales, purchasing, inventory, receivables, payables, and accounting.

## MVP target

The SME ERP MVP should support:

- master data: products, customers, suppliers, warehouses, users, roles, company settings
- warehouse operations: receipts, shipments, transfers, adjustments, stock counts
- commercial documents: sales invoices, purchase invoices, payments
- finance core: chart of accounts, periods, journals, posting engine, AR and AP
- control layer: permissions, numbering, posting locks, approvals, reversals, auditability
- management reporting: stock valuation, AR/AP aging, trial balance, P&L, balance sheet

## Delivery sequence

Build in this order:

1. Inventory adjustments and warehouse transfers
2. Partial receipt and partial shipment flows
3. Sales invoices and purchase invoices
4. Customer payments and vendor payments
5. Finance core and posting engine
6. Control layer and reporting

This sequence fits the current repo because inventory movement posting already exists and is the strongest foundation in the system.

## Architectural rules

Keep these rules fixed through the MVP:

1. Reuse the current light CQRS split.
2. Keep one folder per aggregate or feature in models, contracts, services, and UI.
3. Add per-entity EF configuration classes instead of inline mapping.
4. Keep tenant-aware entities and query filters consistent with existing entities.
5. Do not mutate posted documents. Use reversal or corrective documents.
6. Use explicit posting for finance-facing documents.
7. Use moving-average costing first. Do not start with FIFO.
8. Continue using claim-based policies from the existing permission model.

## Phase 1: Inventory control completion

This phase completes the warehouse domain and should be the next code implementation slice.

### Entities

Add these entities in `VexorionERP.Models/Inventory`:

- `InventoryAdjustment`
- `InventoryAdjustmentLine`
- `StockTransfer`
- `StockTransferLine`
- `StockCount`
- `StockCountLine`

Suggested fields:

`InventoryAdjustment`
- `Id`
- `TenantId`
- `AdjustmentNumber`
- `WarehouseId`
- `AdjustmentDateUtc`
- `Status`
- `Reason`
- `Notes`
- `CreatedByUserId`
- `PostedAtUtc`
- `ReversedAtUtc`

`InventoryAdjustmentLine`
- `Id`
- `InventoryAdjustmentId`
- `ProductId`
- `QuantityDelta`
- `UnitCost`
- `Reason`

`StockTransfer`
- `Id`
- `TenantId`
- `TransferNumber`
- `SourceWarehouseId`
- `DestinationWarehouseId`
- `TransferDateUtc`
- `Status`
- `Notes`
- `CreatedByUserId`
- `PostedAtUtc`
- `ReversedAtUtc`

`StockTransferLine`
- `Id`
- `StockTransferId`
- `ProductId`
- `Quantity`
- `UnitCost`

`StockCount`
- `Id`
- `TenantId`
- `CountNumber`
- `WarehouseId`
- `CountDateUtc`
- `Status`
- `Notes`

`StockCountLine`
- `Id`
- `StockCountId`
- `ProductId`
- `SystemQuantity`
- `CountedQuantity`
- `VarianceQuantity`

### Supporting enums

Add:

- `InventoryAdjustmentStatus`
- `StockTransferStatus`
- `StockCountStatus`

Extend the inventory movement type enum with:

- `InventoryAdjustmentIncrease`
- `InventoryAdjustmentDecrease`
- `StockTransferOut`
- `StockTransferIn`
- `StockCountVarianceIncrease`
- `StockCountVarianceDecrease`
- `InventoryReversal`

### Database changes

Add DbSets and configurations in `VexorionERP.Database` for all new entities.

Add indexes on:

- tenant + number for each document header
- tenant + warehouse + date for inventory documents
- header id + product id for line tables

### Contracts

Add contracts in `VexorionERP.Contracts/Inventory`:

Folders:

- `Adjustments`
- `Transfers`
- `Counts`

For each aggregate, add:

- `Create...Request`
- `Update...Request`
- `...ListItemResponse`
- `...DetailsResponse`
- `Post...Request`
- `Reverse...Request`

### Services

Add services in `VexorionERP.Services/Inventory`:

- `IInventoryAdjustmentCommandService`
- `IInventoryAdjustmentQueryService`
- `IInventoryAdjustmentLineCommandService`
- `IStockTransferCommandService`
- `IStockTransferQueryService`
- `IStockTransferLineCommandService`
- `IStockCountCommandService`
- `IStockCountQueryService`

Reuse the existing inventory posting service for all quantity effects.

Add methods for:

- create
- update
- delete draft
- get list
- get details
- post
- reverse

### Controllers

Add controllers in `VexorionERP/Controllers`:

- `InventoryAdjustmentsController`
- `InventoryAdjustmentLinesController`
- `StockTransfersController`
- `StockTransferLinesController`
- `StockCountsController`
- `StockCountLinesController`

Authorization should follow the existing claim/policy style, using inventory policies instead of inventing a new authorization path.

### Frontend

Add feature folders in `VexorionERP.UI/src/features`:

- `inventoryAdjustments`
- `stockTransfers`
- `stockCounts`

Each feature should follow the current pattern:

- data grid/list view
- editor dialog or workspace
- delete dialog when draft deletion is allowed
- action buttons for post and reverse

Add routes for:

- `/inventory-adjustments`
- `/stock-transfers`
- `/stock-counts`

Add navigation entries under the Inventory section.

### Tests

Add focused service tests for:

- adjustment increases on-hand
- adjustment decreases on-hand
- transfer moves stock between warehouses without changing global total
- insufficient stock blocks transfer-out
- post locks lines and header edits
- reverse creates compensating movements

## Phase 2: Partial receipt and shipment execution

This phase upgrades existing purchase and sales orders from status-only flows into operational execution flows.

### Existing aggregates to extend

Extend:

- `PurchaseOrder`
- `PurchaseOrderLine`
- `SalesOrder`
- `SalesOrderLine`

### Required fields

Add to purchase order lines:

- `OrderedQuantity`
- `ReceivedQuantity`
- `RemainingQuantity`

Add to sales order lines:

- `OrderedQuantity`
- `ReservedQuantity`
- `ShippedQuantity`
- `RemainingQuantity`

### New documents

Add these aggregates:

- `PurchaseReceipt`
- `PurchaseReceiptLine`
- `SalesShipment`
- `SalesShipmentLine`

This is preferable to overloading order status because receipt and shipment need their own audit trail.

### Contracts

Add in `VexorionERP.Contracts/Purchasing/Receipts`:

- create receipt from purchase order
- list/details responses
- post receipt
- reverse receipt

Add in `VexorionERP.Contracts/Sales/Shipments`:

- create shipment from sales order
- list/details responses
- post shipment
- reverse shipment

### Services

Add:

- `IPurchaseReceiptCommandService`
- `IPurchaseReceiptQueryService`
- `ISalesShipmentCommandService`
- `ISalesShipmentQueryService`

Responsibilities:

- validate remaining quantities
- create movements through the inventory posting service
- update order execution totals
- prevent over-receipt and over-shipment
- lock posted documents

### UI

Add:

- receipt workspaces reachable from purchase orders
- shipment workspaces reachable from sales orders
- line-level remaining quantity and execution summaries

### Tests

Add tests for:

- partial receipt updates balances and remaining quantity
- partial shipment updates balances and remaining quantity
- final receipt/shipment completes the order only when remaining quantity reaches zero
- reversal restores the right stock and execution totals

### Phase 2 completion status (26 Apr 2026)

Phase 2 is implemented and validated in the current codebase.

Delivered backend scope:

- extended order line execution fields for purchase and sales flows
- new `PurchaseReceipt` and `SalesShipment` aggregates with line entities
- EF Core mappings, DbSets, and migration for receipt/shipment persistence
- inventory movement posting integration for receipts and shipments
- command/query services and controllers for receipt/shipment workflows
- DI registration and policy-based authorization alignment with existing patterns

Delivered frontend scope:

- API request/response types and clients for purchase receipts and sales shipments
- UI types, data grids, create dialogs, and feature pages for both flows
- app routing and navigation entries for receipt and shipment workspaces
- action links from orders to execution pages:
	- purchase order -> view receipts
	- sales order -> view shipments

Validation evidence:

- all service tests passing, including partial and cumulative execution scenarios
- TypeScript compile check passing for the UI workspace
- no open implementation gaps for Milestone B receipt/shipment execution

Notes:

- reversal APIs for receipts/shipments remain listed in roadmap DTO guidance but were not part of this delivered slice; current implementation includes create/list/details/post and draft delete behavior.

## Phase 3: Commercial document layer

This phase adds billing and payment obligations.

### Entities

Add in `VexorionERP.Models/Sales/Invoices`:

- `SalesInvoice`
- `SalesInvoiceLine`
- `CustomerPayment`
- `CustomerPaymentAllocation`

Add in `VexorionERP.Models/Purchasing/Invoices`:

- `PurchaseInvoice`
- `PurchaseInvoiceLine`
- `VendorPayment`
- `VendorPaymentAllocation`

Add in a shared finance or commercial folder:

- `PaymentTerm`
- `TaxCode`

### Fields

`SalesInvoice`
- invoice number
- customer id
- source sales order id optional
- source shipment id optional
- invoice date
- due date
- subtotal
- tax total
- grand total
- paid total
- balance due
- status
- posted at
- reversed at

`PurchaseInvoice`
- invoice number
- supplier id
- source purchase order id optional
- source receipt id optional
- vendor reference number
- invoice date
- due date
- subtotal
- tax total
- grand total
- paid total
- balance due
- status
- posted at
- reversed at

### Contracts

Add folders:

- `VexorionERP.Contracts/Sales/Invoices`
- `VexorionERP.Contracts/Sales/Payments`
- `VexorionERP.Contracts/Purchasing/Invoices`
- `VexorionERP.Contracts/Purchasing/Payments`

### Services and controllers

Create command/query services and controllers that mirror the existing pattern for products, orders, and lines.

### UI

Add feature folders and pages:

- `salesInvoices`
- `purchaseInvoices`
- `customerPayments`
- `vendorPayments`

Add actions from source documents:

- create sales invoice from shipment or sales order
- create purchase invoice from receipt or purchase order

### Tests

Add tests for:

- invoice total calculation
- due date calculation from payment terms
- payment allocation updates balance due
- over-allocation blocked
- posted invoice cannot be edited

### Phase 3 kickoff checklist (ready to execute)

Use this as the implementation runbook for Phase 3. Execute top to bottom.

#### A. Backend foundations

- [ ] Define invoice status enums for sales and purchasing flows (draft, posted, partially paid, paid, cancelled or reversed according to existing style).
- [ ] Create entities and line entities:
	- `SalesInvoice`, `SalesInvoiceLine`
	- `PurchaseInvoice`, `PurchaseInvoiceLine`
- [ ] Add optional source links on headers:
	- sales: source sales order id, source shipment id
	- purchase: source purchase order id, source receipt id
- [ ] Add monetary fields on headers:
	- subtotal, tax total, grand total, paid total, balance due
- [ ] Add due-date and reference fields required by current UI and document flow.
- [ ] Add DbSets in `AppDbContext` and EF configurations for all headers/lines.
- [ ] Add indexes:
	- tenant + invoice number (unique per tenant)
	- tenant + customer or supplier + invoice date
	- header id + line number or product id
- [ ] Generate and apply focused migration for invoice tables only.

#### B. Contracts and API surface

- [ ] Add sales invoice contracts under `VexorionERP.Contracts/Sales/Invoices`:
	- create request, update request, list response, details response
	- line create and line update contracts
	- post request and reverse request placeholders if reverse is deferred
- [ ] Add purchase invoice contracts under `VexorionERP.Contracts/Purchasing/Invoices` with equivalent structure.
- [ ] Keep response DTO shape aligned with existing list/detail patterns used by orders and receipts.

#### C. Domain/service implementation

- [ ] Implement `ISalesInvoiceCommandService` and `ISalesInvoiceQueryService`.
- [ ] Implement `IPurchaseInvoiceCommandService` and `IPurchaseInvoiceQueryService`.
- [ ] Enforce invariant checks:
	- at least one line on post
	- no negative quantities or unit prices
	- no edits to posted invoices
- [ ] Implement totals calculation logic at service layer:
	- line amount = quantity * unit price
	- header subtotal = sum of line amounts
	- grand total = subtotal + tax total
	- balance due = grand total - paid total
- [ ] Implement status transitions:
	- draft -> posted
	- posted -> partially paid -> paid (as paid total changes)
- [ ] Add create-from-source workflows:
	- create sales invoice from shipment or sales order
	- create purchase invoice from receipt or purchase order

#### D. Controllers and authorization

- [ ] Add controllers:
	- `SalesInvoicesController`
	- `PurchaseInvoicesController`
- [ ] Expose endpoints matching existing pattern:
	- list, details, create, update, delete draft, post
- [ ] Apply policy-based authorization consistent with `AppPermissions.Sales.*` and `AppPermissions.Purchasing.*` naming style.
- [ ] Register services in DI extension setup.

#### E. Frontend implementation

- [ ] Add API request/response types for sales and purchase invoices.
- [ ] Add API clients in `src/lib/api` for list/details/create/update/post/delete draft.
- [ ] Add UI types in `src/types/ui` for grid rows and dialog/form values.
- [ ] Add feature folders:
	- `src/features/salesInvoices`
	- `src/features/purchaseInvoices`
- [ ] Implement pages with:
	- data grid
	- create/edit dialog
	- post and draft-delete actions
- [ ] Wire routes and navigation entries in app shell.
- [ ] Add order/shipment and order/receipt action buttons to launch invoice creation with route state.

#### F. Test checklist (must pass before merge)

- [ ] Sales invoice totals computed correctly across multi-line documents.
- [ ] Purchase invoice totals computed correctly across multi-line documents.
- [ ] Due date defaults and payment-term-driven due dates are correct.
- [ ] Posting locks further edits/deletes except allowed reversal path.
- [ ] Source-document-based creation maps lines and references correctly.
- [ ] Over-allocation protection tests prepared for payment phase integration.
- [ ] Existing test suite remains green.

#### G. Completion gates for Phase 3

Phase 3 is complete only when all conditions are true:

- [ ] Backend compile passes.
- [ ] Frontend TypeScript compile passes.
- [ ] Invoice service tests pass.
- [ ] Manual smoke test passes for:
	- create from source document
	- post invoice
	- visible balance due in list/details UI
- [ ] Documentation updated with implemented endpoints and known deferred items.

## Phase 4: Finance core

This phase makes the system a real ERP.

### Entities

Add in `VexorionERP.Models/Finance`:

- `Account`
- `JournalEntry`
- `JournalEntryLine`
- `FiscalPeriod`
- `PostingBatch` optional

Suggested account fields:

- code
- name
- account type
- normal balance
- is posting allowed
- is active

Suggested journal entry fields:

- journal number
- source document type
- source document id
- posting date
- fiscal period id
- status
- total debit
- total credit
- reversed journal entry id optional

### Posting engine

Add a dedicated posting service in `VexorionERP.Services/Finance`:

- `IPostingService`
- `PostingService`

Responsibilities:

- validate period is open
- validate source document is postable
- generate balanced journal entries
- prevent duplicate posting for the same source document
- create reversal journals

### Initial posting rules

Start with these document types:

- inventory adjustment
- stock transfer if valuation entries are needed
- sales invoice
- purchase invoice
- customer payment
- vendor payment

### Contracts

Add in `VexorionERP.Contracts/Finance`:

- accounts
- journals
- periods
- posting requests
- reversal requests

### UI

Add feature folders:

- `accounts`
- `journals`
- `fiscalPeriods`

### Tests

Add tests for:

- debit total equals credit total
- posting blocked for closed period
- duplicate posting blocked
- reversal creates inverse journal lines

## Phase 5: Controls and reporting

This phase adds operational safety and management visibility.

### Controls

Add:

- document number sequence configuration
- approval rules by document type and amount
- immutable posted documents
- reversal-only corrections
- expanded audit log browsing

### Permissions

Extend the current permission model with new domains rather than creating a parallel role system.

Add new permission groups aligned with existing style:

- `InventoryAdjustments.View`
- `InventoryAdjustments.Manage`
- `StockTransfers.View`
- `StockTransfers.Manage`
- `StockCounts.View`
- `StockCounts.Manage`
- `SalesInvoices.View`
- `SalesInvoices.Manage`
- `PurchaseInvoices.View`
- `PurchaseInvoices.Manage`
- `Payments.View`
- `Payments.Manage`
- `Accounting.View`
- `Accounting.Manage`
- `Reports.View`

Update the role permission matrix in the startup seed path.

### Reports

Add query/report services for:

- stock valuation
- inventory movement audit
- low stock and reorder recommendations
- AR aging
- AP aging
- trial balance
- profit and loss
- balance sheet

UI pages:

- `/reports/inventory-valuation`
- `/reports/ar-aging`
- `/reports/ap-aging`
- `/reports/trial-balance`
- `/reports/profit-loss`
- `/reports/balance-sheet`

## DTO checklist by module

For each new aggregate, add the same baseline contract set:

- `Create...Request`
- `Update...Request`
- `...ListItemResponse`
- `...DetailsResponse`
- `Delete...Request` only if deletion is explicit and not route-only
- `Post...Request`
- `Reverse...Request`

For line aggregates, add:

- `Create...LineRequest`
- `Update...LineRequest`
- `...LineListItemResponse`
- `...LineDetailsResponse`

For reporting modules, add filter requests and row-based response DTOs.

## Controller naming and endpoint pattern

Follow the current controller shape already used in the repo.

Examples:

- `GET /api/inventory-adjustments`
- `GET /api/inventory-adjustments/{id}`
- `POST /api/inventory-adjustments`
- `PUT /api/inventory-adjustments/{id}`
- `DELETE /api/inventory-adjustments/{id}`
- `POST /api/inventory-adjustments/{id}/post`
- `POST /api/inventory-adjustments/{id}/reverse`

Use the same pattern for transfers, counts, receipts, shipments, invoices, payments, journals, and periods.

## Suggested migration order

Keep database migrations narrow and staged.

1. Add inventory adjustments and stock transfers
2. Extend inventory movement types and balances if needed
3. Add stock counts
4. Add receipt and shipment entities plus order execution fields
5. Add sales invoices and purchase invoices
6. Add payments and allocations
7. Add finance core tables: accounts, periods, journals
8. Add numbering and approval tables if needed
9. Add reporting support tables only if the reporting model truly needs materialized data

Do not combine all of these into one migration.

## Suggested implementation milestones

### Milestone A

- inventory adjustments
- stock transfers
- inventory movement extensions
- focused service tests

### Milestone B

- stock counts
- partial receipts
- partial shipments
- execution totals on order lines

### Milestone C

Status: Completed (26 Apr 2026)

- sales invoices
- purchase invoices
- billing UI

### Milestone D

Status: Completed (26 Apr 2026)

- customer payments
- vendor payments
- outstanding balance tracking

### Milestone E

Status: Completed (26 Apr 2026)

- chart of accounts
- fiscal periods
- journal entries
- posting engine

### Milestone E execution checklist (kickoff)

Run this checklist in order for the first Milestone E implementation slice.

#### 1) Entities

- [x] Add finance entities under `VexorionERP.Models/Finance`:
	- `Account`
	- `FiscalPeriod`
	- `JournalEntry`
	- `JournalEntryLine`
- [x] Add core fields and invariants:
	- account code uniqueness per tenant
	- journal total debit and credit tracking
	- optional reversal linkage (`ReversedJournalEntryId`)
- [x] Add enums/value choices needed for:
	- account type
	- journal status
	- normal balance

#### 2) EF + migration

- [x] Add DbSets in `AppDbContext` for all finance entities.
- [x] Add per-entity EF configurations and tenant-aware indexes.
- [x] Add indexes:
	- tenant + account code (unique)
	- tenant + fiscal period range
	- tenant + journal number (unique)
- [x] Create focused migration for finance core tables only.
- [x] Apply migration and verify schema on dev database.

#### 3) Posting service

- [x] Create `IPostingService` and `PostingService` in `VexorionERP.Services/Finance`.
- [x] Implement posting guards:
	- fiscal period must be open
	- source document must be eligible for posting
	- duplicate posting blocked for the same source reference
- [x] Implement balanced journal creation logic where $\sum debit = \sum credit$.
- [x] Implement reversal journal generation with inverse lines.
- [x] Add first document posting adapters for:
	- sales invoices
	- purchase invoices
	- customer payments
	- vendor payments

#### 4) Controllers

- [x] Add controllers for:
	- accounts
	- fiscal periods
	- journals
	- posting operations
- [x] Keep endpoint pattern aligned with existing API style.
- [x] Apply policy-based authorization using existing permission conventions.
- [x] Register finance services and posting service in DI.

#### 5) UI

- [x] Add feature modules/pages for:
	- accounts
	- fiscal periods
	- journals
- [x] Add API contracts and client wrappers for finance endpoints.
- [x] Add routes and navigation entries for new finance pages.
- [x] Provide journal list/details view with source-document references.

#### Done criteria for Milestone E first slice

- [x] Backend build and tests pass.
- [x] Frontend TypeScript compile passes.
- [x] Posting tests prove balanced journals, closed period blocking, and duplicate posting protection.
- [x] Manual smoke test passes for creating accounts/periods and posting at least one sales invoice.

Manual smoke evidence (26 Apr 2026, local dev API):
- Fiscal period id: `ae950f08-6457-4fb3-9b74-f7b4b2dc8b81`
- AR account id: `6024a290-47e3-45e8-b4f1-a544f9289a20`
- Revenue account id: `318df217-9e03-4701-8254-5327b20dd21c`
- Sales invoice id: `a9b0236c-caf5-45f4-b263-a62d300298b6`
- Posted journal id: `16afa012-eae2-47f9-9491-34061f113c74` (`JRN-20990426-0001`)

### Milestone F

Status: In Progress (26 Apr 2026)

- approvals
- numbering
- reporting
- finance dashboards

### Milestone F execution checklist (F1 numbering)

Run this checklist in order for the first Milestone F implementation slice.

#### 1) Numbering domain + schema

- [x] Add numbering sequence model for tenant-scoped document numbering.
- [x] Add reset period enum (none/yearly/monthly/daily).
- [x] Add EF configuration and tenant+document-type unique index.
- [x] Add DB migration for numbering sequence storage.

#### 2) Numbering service

- [x] Add `INumberingService` and `NumberingService` in finance services.
- [x] Add default sequence provisioning for:
	- sales invoices
	- purchase invoices
	- journal entries
- [x] Add date-aware token expansion in prefixes (`{yyyy}`, `{MM}`, `{dd}`, etc.).
- [x] Add reset behavior per configured reset period.

#### 3) Integration into document flows

- [x] Wire sales invoice creation to support auto-number generation (`InvoiceNumber = AUTO`).
- [x] Wire purchase invoice creation to support auto-number generation (`InvoiceNumber = AUTO`).
- [x] Wire journal posting to use numbering service for journal numbers.

#### 4) Admin API surface

- [x] Add numbering sequence endpoints for list/upsert.
- [x] Protect endpoints with billing view/manage permissions.

#### Done criteria for Milestone F1 (numbering)

- [x] Backend build and tests pass with numbering changes.
- [x] Numbering tests prove sequential generation and reset behavior.
- [x] Invoice creation supports explicit number and `AUTO` generation.

## Immediate next coding slice

The next code implementation slice is Milestone F1 (numbering) in this order:

1. numbering domain + schema
2. numbering service
3. document flow integration
4. admin API endpoints
5. tests + validation

Start with tenant-scoped sequence definitions and wire them into sales invoices, purchase invoices, and journals before moving on to approvals/reporting/dashboard slices.