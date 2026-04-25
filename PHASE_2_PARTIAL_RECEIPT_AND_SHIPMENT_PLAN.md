# Phase 2: Partial Receipt & Shipment Execution Plan

This document provides detailed planning for Phase 2, which upgrades Purchase Orders and Sales Orders from status-only documents to operational execution flows with partial receipts and shipments.

## Phase 2 Overview

**Objective:** Enable users to track and execute partial receipt and shipment workflows, allowing orders to be fulfilled incrementally across multiple warehouse operations.

**Key Capabilities:**
- Create PurchaseReceipt documents linked to PurchaseOrders
- Create SalesShipment documents linked to SalesOrders  
- Track remaining quantities on order lines
- Prevent over-receipt and over-shipment
- Post receipts/shipments to inventory (using existing posting engine)
- Support reversals for posted receipts/shipments
- Maintain audit trail of all execution movements

## Entities & Enums

### Fields to Add to Existing Aggregates

**PurchaseOrderLine** — Add execution tracking:
- `OrderedQuantity` (decimal) — Original ordered quantity (copy from existing Quantity field)
- `ReceivedQuantity` (decimal) — Total received so far
- `RemainingQuantity` (computed: `OrderedQuantity - ReceivedQuantity`)

**SalesOrderLine** — Add execution tracking:
- `OrderedQuantity` (decimal) — Original ordered quantity
- `ReservedQuantity` (decimal) — Quantity reserved for this order
- `ShippedQuantity` (decimal) — Total shipped so far
- `RemainingQuantity` (computed: `OrderedQuantity - ShippedQuantity`)

### New Entities

**PurchaseReceipt**
```csharp
public class PurchaseReceipt : TenantEntityBase
{
    public string ReceiptNumber { get; set; }        // Unique receipt number
    public Guid PurchaseOrderId { get; set; }        // Link to source PO
    public Guid WarehouseId { get; set; }            // Receiving warehouse
    public DateOnly ReceiptDate { get; set; }
    public DocumentStatus Status { get; set; }       // Draft → Completed
    public string? Notes { get; set; }
    
    public PurchaseOrder? PurchaseOrder { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<PurchaseReceiptLine> Lines { get; set; }
}
```

**PurchaseReceiptLine**
```csharp
public class PurchaseReceiptLine : TenantEntityBase
{
    public Guid PurchaseReceiptId { get; set; }
    public Guid PurchaseOrderLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ReceivedQuantity { get; set; }
    public decimal UnitCost { get; set; }            // Cost at receipt time
    
    public PurchaseReceipt? PurchaseReceipt { get; set; }
    public PurchaseOrderLine? PurchaseOrderLine { get; set; }
    public Product? Product { get; set; }
}
```

**SalesShipment**
```csharp
public class SalesShipment : TenantEntityBase
{
    public string ShipmentNumber { get; set; }       // Unique shipment number
    public Guid SalesOrderId { get; set; }           // Link to source SO
    public Guid WarehouseId { get; set; }            // Shipping warehouse
    public DateOnly ShipmentDate { get; set; }
    public DocumentStatus Status { get; set; }       // Draft → Completed
    public string? Notes { get; set; }
    
    public SalesOrder? SalesOrder { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<SalesShipmentLine> Lines { get; set; }
}
```

**SalesShipmentLine**
```csharp
public class SalesShipmentLine : TenantEntityBase
{
    public Guid SalesShipmentId { get; set; }
    public Guid SalesOrderLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ShippedQuantity { get; set; }
    public decimal UnitPrice { get; set; }           // Price at shipment time
    
    public SalesShipment? SalesShipment { get; set; }
    public SalesOrderLine? SalesOrderLine { get; set; }
    public Product? Product { get; set; }
}
```

## Database Changes

### EF Core Configurations

1. **PurchaseOrderLineConfiguration** — Add properties for execution tracking
2. **SalesOrderLineConfiguration** — Add properties for execution tracking
3. **PurchaseReceiptConfiguration** — New configuration with indexes
4. **PurchaseReceiptLineConfiguration** — New configuration
5. **SalesShipmentConfiguration** — New configuration with indexes
6. **SalesShipmentLineConfiguration** — New configuration

### Migration

Create migration: `AddPartialReceiptAndShipmentExecution`

Adds:
- `OrderedQuantity`, `ReceivedQuantity` columns to PurchaseOrderLine
- `OrderedQuantity`, `ReservedQuantity`, `ShippedQuantity` columns to SalesOrderLine
- New tables: PurchaseReceipt, PurchaseReceiptLine, SalesShipment, SalesShipmentLine
- Indexes for document lookup and date-based queries

### Migration Data Step

On initial migration:
- Copy existing `Quantity` → `OrderedQuantity` for all PurchaseOrderLines
- Copy existing `Quantity` → `OrderedQuantity` for all SalesOrderLines
- Set `ReceivedQuantity` = 0 for all PurchaseOrderLines
- Set `ShippedQuantity` = 0 for all SalesOrderLines

## Contracts (DTOs)

### PurchaseReceipt Contracts

Location: `VexorionERP.Contracts/Purchasing/Receipts/`

- `CreatePurchaseReceiptRequest` — Create receipt from PO
- `UpdatePurchaseReceiptRequest` — Update receipt (draft only)
- `PurchaseReceiptListItemResponse` — List grid row
- `PurchaseReceiptDetailsResponse` — Full receipt with lines
- `PostPurchaseReceiptRequest` — Post receipt to inventory
- `ReversePurchaseReceiptRequest` — Reverse posted receipt

### PurchaseReceiptLine Contracts

- `CreatePurchaseReceiptLineRequest`
- `UpdatePurchaseReceiptLineRequest`
- `PurchaseReceiptLineDetailsResponse`

### SalesShipment Contracts

Location: `VexorionERP.Contracts/Sales/Shipments/`

- `CreateSalesShipmentRequest` — Create shipment from SO
- `UpdateSalesShipmentRequest` — Update shipment (draft only)
- `SalesShipmentListItemResponse` — List grid row
- `SalesShipmentDetailsResponse` — Full shipment with lines
- `PostSalesShipmentRequest` — Post shipment to inventory
- `ReverseSalesShipmentRequest` — Reverse posted shipment

### SalesShipmentLine Contracts

- `CreateSalesShipmentLineRequest`
- `UpdateSalesShipmentLineRequest`
- `SalesShipmentLineDetailsResponse`

## Services

### PurchaseReceipt Services

**IPurchaseReceiptCommandService**
- `CreateAsync(orderId, request)` → Creates receipt from PO, copies lines
- `UpdateAsync(receiptId, request)` → Updates draft receipt
- `DeleteAsync(receiptId)` → Deletes draft receipt
- `PostAsync(receiptId, request)` → Post receipt, create inventory movements, update PO line quantities
- `ReverseAsync(receiptId, request)` → Reverse posted receipt, create compensating movements

**IPurchaseReceiptQueryService**
- `GetAllAsync()` → Returns all receipts filtered by tenant
- `GetByIdAsync(receiptId)` → Returns receipt with lines
- `GetByPurchaseOrderIdAsync(orderId)` → Returns receipts for a specific order

### SalesShipment Services

**ISalesShipmentCommandService**
- `CreateAsync(orderId, request)` → Creates shipment from SO, copies lines
- `UpdateAsync(shipmentId, request)` → Updates draft shipment
- `DeleteAsync(shipmentId)` → Deletes draft shipment
- `PostAsync(shipmentId, request)` → Post shipment, create inventory movements, update SO line quantities
- `ReverseAsync(shipmentId, request)` → Reverse posted shipment

**ISalesShipmentQueryService**
- `GetAllAsync()` → Returns all shipments filtered by tenant
- `GetByIdAsync(shipmentId)` → Returns shipment with lines
- `GetBySalesOrderIdAsync(orderId)` → Returns shipments for a specific order

### Business Logic

**Receipt Posting Logic**
1. Validate all receipt lines have quantities > 0
2. Validate receipt date is >= PO date
3. Validate total received quantity (existing + new) does not exceed OrderedQuantity per line
4. Create InventoryMovement with type = PurchaseReceipt for each line
5. Update PurchaseOrderLine.ReceivedQuantity
6. Mark receipt as Completed
7. If PurchaseOrder.ReceivedQuantity = PurchaseOrder.OrderedQuantity across all lines, mark PO as Completed

**Shipment Posting Logic**
1. Validate all shipment lines have quantities > 0
2. Validate shipment date is >= SO date
3. Validate source warehouse has sufficient on-hand inventory
4. Validate total shipped quantity (existing + new) does not exceed OrderedQuantity per line
5. Create inventory movements: type = SalesReservationRelease + SalesShipment (2-step)
6. Update SalesOrderLine.ShippedQuantity
7. Mark shipment as Completed
8. If SalesOrder.ShippedQuantity = SalesOrder.OrderedQuantity across all lines, mark SO as Completed

**Reversal Logic**
- Create compensating InventoryMovements (opposite direction)
- Reset document status to Draft
- Reset order line execution totals

## Controllers

### PurchaseReceiptsController

Location: `VexorionERP/Controllers/`

Endpoints:
- `GET /api/purchase-receipts` — List all receipts
- `GET /api/purchase-receipts/{receiptId}` — Get receipt details
- `GET /api/purchase-orders/{orderId}/receipts` — Get receipts for PO
- `POST /api/purchase-receipts` — Create receipt
- `PUT /api/purchase-receipts/{receiptId}` — Update receipt
- `DELETE /api/purchase-receipts/{receiptId}` — Delete receipt
- `POST /api/purchase-receipts/{receiptId}/post` — Post receipt
- `POST /api/purchase-receipts/{receiptId}/reverse` — Reverse receipt

### PurchaseReceiptLinesController

Endpoints:
- `POST /api/purchase-receipts/{receiptId}/lines` — Add line
- `PUT /api/purchase-receipts/{receiptId}/lines/{lineId}` — Update line
- `DELETE /api/purchase-receipts/{receiptId}/lines/{lineId}` — Delete line

### SalesShipmentsController

Endpoints:
- `GET /api/sales-shipments` — List all shipments
- `GET /api/sales-shipments/{shipmentId}` — Get shipment details
- `GET /api/sales-orders/{orderId}/shipments` — Get shipments for SO
- `POST /api/sales-shipments` — Create shipment
- `PUT /api/sales-shipments/{shipmentId}` — Update shipment
- `DELETE /api/sales-shipments/{shipmentId}` — Delete shipment
- `POST /api/sales-shipments/{shipmentId}/post` — Post shipment
- `POST /api/sales-shipments/{shipmentId}/reverse` — Reverse shipment

### SalesShipmentLinesController

Endpoints:
- `POST /api/sales-shipments/{shipmentId}/lines` — Add line
- `PUT /api/sales-shipments/{shipmentId}/lines/{lineId}` — Update line
- `DELETE /api/sales-shipments/{shipmentId}/lines/{lineId}` — Delete line

## Frontend Implementation

### PurchaseReceipts Feature

Location: `VexorionERP.UI/src/features/purchaseReceipts/`

**Pages:**
- `PurchaseReceiptsPage.tsx` — Main grid + line management workspace
  - Header grid showing all receipts (number, PO number, warehouse, date, status)
  - Receipt details panel with line grid
  - Create receipt from existing PO dialog
  - Add/edit/delete line dialogs
  - Post confirmation dialog
  - Reverse confirmation dialog

**Hooks:**
- `usePurchaseReceiptsLookup()` — Fetch receipt list
- `usePurchaseReceiptDetails()` — Fetch receipt with lines
- `usePurchaseReceiptAPI()` — CRUD operations

**Features:**
- Line editor shows remaining quantity from PO
- Cannot receive more than remaining quantity
- Prevents posting receipts with no lines
- Status transitions: Draft → Completed
- Reversible when posted

### SalesShipments Feature

Location: `VexorionERP.UI/src/features/salesShipments/`

**Pages:**
- `SalesShipmentsPage.tsx` — Main grid + line management workspace
  - Header grid showing all shipments (number, SO number, warehouse, date, status)
  - Shipment details panel with line grid
  - Create shipment from existing SO dialog
  - Add/edit/delete line dialogs
  - Post confirmation dialog
  - Reverse confirmation dialog

**Hooks:**
- `useSalesShipmentsLookup()` — Fetch shipment list
- `useSalesShipmentDetails()` — Fetch shipment with lines
- `useSalesShipmentAPI()` — CRUD operations

**Features:**
- Line editor shows remaining quantity from SO and on-hand inventory
- Cannot ship more than remaining quantity
- Cannot ship more than warehouse on-hand quantity
- Prevents posting shipments with no lines
- Status transitions: Draft → Completed
- Reversible when posted

### Update PurchaseOrder & SalesOrder Pages

**PurchaseOrderDetailsPage**
- Add "Remaining Quantity" column to order lines grid
- Add "Create Receipt" button that opens receipt creation dialog
- Add receipts grid showing all receipts for this order
- Show total received vs. ordered with progress indicator

**SalesOrderDetailsPage**
- Add "Remaining Quantity" column to order lines grid
- Add "Create Shipment" button that opens shipment creation dialog
- Add shipments grid showing all shipments for this order
- Show total shipped vs. ordered with progress indicator

## Testing Strategy

### Service Tests

Add to `VexorionERP.Services.Tests`:

**PurchaseReceiptCommandService Tests**
- ✓ Create receipt from PO copies correct lines
- ✓ Post receipt creates inventory movements
- ✓ Post receipt updates PO line quantities
- ✓ Post receipt prevents over-receipt
- ✓ Reverse receipt compensates inventory
- ✓ Prevent posting with zero lines
- ✓ Prevent posting with quantities exceeding remaining

**SalesShipmentCommandService Tests**
- ✓ Create shipment from SO copies correct lines
- ✓ Post shipment creates inventory movements
- ✓ Post shipment updates SO line quantities
- ✓ Post shipment validates on-hand inventory
- ✓ Post shipment prevents over-shipment
- ✓ Reverse shipment compensates inventory
- ✓ Prevent posting with zero lines
- ✓ Prevent posting with quantities exceeding remaining or on-hand

### Web Tests

Add to `VexorionERP.Web.Tests/Purchasing/` and `Sales/`:

**Authorization Tests**
- PurchaseReceipts: View/Manage permissions
- SalesShipments: View/Manage permissions

**Validation Tests**
- Receipt with invalid quantities
- Shipment with insufficient inventory

**Workflow Tests** (optional)
- Create → Post → Reverse workflow
- Multi-receipt workflow for partial PO satisfaction

## Implementation Sequence

1. **Database Layer** (2-3 hours)
   - Update PurchaseOrderLine & SalesOrderLine properties
   - Add new entity models and EF configurations
   - Create and run migration
   - Update navigation properties

2. **Contracts** (1 hour)
   - Create all 14+ DTO files for receipts and shipments

3. **Services** (4-5 hours)
   - Implement command services with posting logic
   - Implement query services
   - Add DI registration

4. **Controllers** (2 hours)
   - Create PurchaseReceiptsController and lines controller
   - Create SalesShipmentsController and lines controller
   - Add authorization policies

5. **Frontend** (8-10 hours)
   - Create PurchaseReceiptsPage (600+ lines)
   - Create SalesShipmentsPage (600+ lines)
   - Update PurchaseOrderDetailsPage (remaining quantity column + receipt grid)
   - Update SalesOrderDetailsPage (remaining quantity column + shipment grid)
   - Add navigation entries

6. **Testing** (3-4 hours)
   - Service tests for both aggregates
   - Web tests for authorization and validation

7. **Integration** (1-2 hours)
   - Full end-to-end testing
   - Verification of inventory posting
   - Testing reversals and order completion

## Estimated Effort

- **Total Effort:** 22-28 hours
- **Critical Path:** Database changes → Services → Frontend UI
- **Risk Areas:** Inventory movement creation, partial quantity validation

## Deployment Considerations

- **Breaking Change:** PurchaseOrderLine and SalesOrderLine schema changes (adding new columns)
- **Migration:** Backfill OrderedQuantity from existing Quantity values
- **Rollout:** Recommend staged rollout with testing in staging first
- **Backward Compatibility:** Existing orders will have execution totals backfilled to zero

---

**Phase 2 Plan Complete:** Ready for implementation sprint.
