# Milestone B Checklist

This checklist breaks Milestone B (Phase 1B: Stock Counts completion) into concrete repo tasks.

## Backend domain and persistence

- [x] Add `StockCount` model with Id, TenantId, CountNumber, WarehouseId, CountDateUtc, Status, Notes
- [x] Add `StockCountLine` model with Id, StockCountId, ProductId, SystemQuantity, CountedQuantity, VarianceQuantity
- [ ] Add `StockCountStatus` enum (Draft, InProgress, Completed, Cancelled)
- [x] Extend `InventoryMovementType` with StockCountVarianceIncrease and StockCountVarianceDecrease
- [x] Add `DbSet` registrations for StockCount and StockCountLine in `AppDbContext`
- [x] Add EF Core configurations for StockCount and StockCountLine
- [x] Create EF migration for stock counts

## Contracts and API

- [x] Add StockCount request and response DTOs (Create, Update, Post, Reverse)
- [x] Add StockCountLine request and response DTOs
- [x] Add StockCountsController (GET list, GET details, POST create, POST update, POST delete)
- [x] Add StockCountLinesController (POST create, POST update, POST delete)

## Application services

- [x] Add `IStockCountCommandService` for create, update, delete
- [x] Add `IStockCountQueryService` for list and details queries
- [x] Register new services in DI
- [x] Enforce draft-only line edits
- [x] Enforce draft-only deletes for headers

## Stock count posting

- [x] Implement count variance calculation (CountedQuantity - SystemQuantity)
- [x] Add posting for positive variances (inventory increase)
- [x] Add posting for negative variances (inventory decrease)
- [x] Validate positive and negative variance posting
- [x] Implement reversal behavior to compensate posted variances
- [x] Create inventory movements with StockCountVarianceIncrease/StockCountVarianceDecrease types

## Validation hardening

- [x] Prevent posting counts with no active lines
- [x] Prevent updating warehouse after posting
- [x] Prevent invalid quantity entries (negative or non-numeric)

## Tests

- [x] Add service tests for positive variance posting
- [x] Add service tests for negative variance posting
- [x] Add service tests for variance calculation accuracy
- [x] Add service tests for cancellation reversal
- [x] Add web tests for authorization (View/Manage permissions)
- [x] Add web tests for model validation

## Frontend implementation

- [x] Add StockCountsPage with header list and line management
- [x] Add count line dialog with ProductId, SystemQuantity, CountedQuantity input
- [x] Add variance calculation display (auto-calculated: CountedQuantity - SystemQuantity)
- [x] Add system quantity lookup from inventory balance
- [x] Add Post and Reverse action buttons
- [x] Add navigation entry under Inventory
- [x] Add route `/stock-counts`

## Suggested next implementation order

1. Create `StockCount` and `StockCountLine` models and EF configuration
2. Add contracts (DTOs) for all CRUD and posting operations
3. Implement command and query services with posting logic
4. Add controllers with authorization
5. Build frontend StockCountsPage with embedded dialogs
6. Add web tests for authorization and validation
7. Add service-level tests for variance posting

## Milestone B Status

- [x] COMPLETE — Core stock count backend/frontend/tests and EF migration completed
