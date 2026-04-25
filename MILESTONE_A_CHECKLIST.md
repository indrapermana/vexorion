# Milestone A Checklist

This checklist breaks Milestone A into concrete repo tasks for the current implementation phase.

## Backend domain and persistence

- [x] Add `InventoryAdjustment` and `InventoryAdjustmentLine` models
- [x] Add `StockTransfer` and `StockTransferLine` models
- [x] Extend `InventoryMovementType` for adjustments and transfers
- [x] Extend `InventoryMovement` reference fields for new documents
- [x] Add `DbSet` registrations in `AppDbContext`
- [x] Add EF Core configurations for adjustments and transfers
- [x] Create EF migration for adjustments and transfers

## Contracts and API

- [x] Add adjustment request and response DTOs
- [x] Add stock transfer request and response DTOs
- [x] Add adjustment controllers
- [x] Add stock transfer controllers
- [x] Add adjustment line controllers
- [x] Add stock transfer line controllers

## Application services

- [x] Add adjustment command, query, and line command services
- [x] Add stock transfer command, query, and line command services
- [x] Register new services in DI
- [x] Enforce draft-only line edits
- [x] Enforce draft-only deletes for headers

## Inventory posting

- [x] Extend inventory movement posting interface
- [x] Add posting for inventory adjustments on completion
- [x] Add reversal behavior for inventory adjustments on cancellation
- [x] Add posting for stock transfers on completion
- [x] Add reversal behavior for stock transfers on cancellation
- [x] Validate source warehouse on-hand stock before transfer posting

## Validation hardening

- [x] Prevent completing adjustments with no active lines
- [x] Prevent completing transfers with no active lines
- [x] Prevent updating warehouse/source-destination after posting
- [x] Add duplicate-line validation rules if needed

## Tests

- [x] Add service tests for positive adjustment posting
- [x] Add service tests for negative adjustment posting
- [x] Add service tests for transfer posting across warehouses
- [x] Add service tests for insufficient stock on transfer
- [x] Add service tests for cancellation reversal

## Frontend start

- [x] Add adjustment API client helpers
- [x] Add transfer API client helpers
- [x] Add adjustment page shell
- [x] Add transfer page shell
- [x] Add navigation entries under Inventory

## Implementation completed

- [x] Add CRUD dialogs and line management UX for the two new inventory documents
- [x] Add web tests for the new controllers and permission coverage
- [x] Review whether duplicate-line validation should be enforced at the service layer
- [x] Add migration rollout notes and production seed/backfill guidance

## Milestone A Status

**COMPLETED** ✅ All backend, frontend, testing, and documentation tasks delivered. Ready for production deployment.