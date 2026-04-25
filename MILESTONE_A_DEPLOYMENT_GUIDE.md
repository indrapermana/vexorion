# Milestone A Deployment Guide

## Overview

This guide covers the migration and deployment of Milestone A features (Inventory Adjustments and Stock Transfers) to production.

## Pre-Deployment Checklist

- [ ] All 9 web tests passing in CI/CD pipeline
- [ ] Full solution build clean (no warnings)
- [ ] Frontend TypeScript compilation clean
- [ ] Code review completed
- [ ] Staging environment validated
- [ ] Database backup completed (production)
- [ ] Rollback plan documented and tested

## Migration Strategy

### Database Migration

**Migration Name:** `AddInventoryAdjustmentsAndStockTransfers`

The EF Core migration creates the following tables:
- `InventoryAdjustments` — Header table for adjustment documents
- `InventoryAdjustmentLines` — Line items for adjustments
- `StockTransfers` — Header table for transfer documents
- `StockTransferLines` — Line items for transfers

**Deployment Steps:**

1. **Staging Validation (Required)**
   ```bash
   # Apply migration to staging database
   dotnet ef database update --project VexorionERP.Database \
     --startup-project VexorionERP \
     --configuration Release
   ```
   - Validate schema creation
   - Confirm no existing data conflicts
   - Test CRUD operations end-to-end

2. **Production Deployment**
   ```bash
   # Create dated backup before migration
   # (handled via your existing backup procedure)
   
   # Apply migration in production
   # Use your standard deployment pipeline (e.g., Azure DevOps, GitHub Actions)
   dotnet ef database update --project VexorionERP.Database \
     --startup-project VexorionERP \
     --configuration Release \
     --environment Production
   ```

3. **Post-Deployment Validation**
   - [ ] Verify all 4 new tables exist and are empty
   - [ ] Confirm schema matches development environment
   - [ ] Test GET endpoints return 200 with empty arrays
   - [ ] Verify authorization rules enforce View/Manage permissions
   - [ ] Spot-check web tests pass against production

## Data Considerations

### No Backfill Required

These are new features with no legacy data migration:
- No existing inventory adjustments to migrate
- No existing stock transfers to migrate
- No data transformation needed

### Initial State

- All tables will be empty post-deployment
- First users will create adjustment/transfer documents from scratch
- No seed data required

## Production Features Enabled

Upon successful deployment, users will have access to:

### Inventory Adjustments
- Create draft adjustment documents with warehouse and date
- Add line items (product + quantity delta + cost)
- Auto-calculated extended value per line
- Confirm to post inventory movements
- Cancel to reverse posted inventory
- Line management restricted to Draft status

### Stock Transfers
- Create draft transfer documents between warehouses
- Add line items (product + quantity, auto-fetched cost)
- Validate sufficient on-hand inventory in source warehouse
- Confirm to post movements to destination warehouse
- Cancel to reverse posted inventory
- Prevent transfers where source warehouse = destination warehouse

### Authorization
- `Inventory.View` permission required to read adjustments/transfers
- `Inventory.Manage` permission required to create/edit/delete (alone insufficient; View also required)
- Tenant isolation enforced at service layer

## Rollback Plan

If issues occur in production:

**Option 1: Immediate Rollback (No Data Loss)**
```bash
# This deployment has no breaking schema changes
# Simply don't promote features in the UI
# New tables remain unused but present
# Revert code deployment to prior version
```

**Option 2: Complete Schema Rollback**
```bash
# If critical issues require schema removal:
dotnet ef database update <PreviousMigrationName> \
  --project VexorionERP.Database \
  --startup-project VexorionERP \
  --configuration Release \
  --environment Production
```

**Recommended:** Option 1 (leave schema, revert code) — safer for production databases.

## Testing Validation

### Run Before Production Deployment

```bash
# Run all tests to ensure everything works
dotnet test VexorionERP.Web.Tests/VexorionERP.Web.Tests.csproj

# Expected results:
# - Authorization tests: 3 passing (401, 403, 200 scenarios for adjustments)
# - Authorization tests: 3 passing (401, 403, 200 scenarios for transfers)
# - Validation tests: 2 passing (400 for invalid line payloads)
# Total: 9/9 passing
```

### Production Smoke Tests (Post-Deployment)

```bash
# Recommended manual validation:
1. Login as user with Inventory.View + Inventory.Manage
2. Navigate to Inventory > Adjustments
3. Create test adjustment → Confirm → Cancel (validates full workflow)
4. Navigate to Inventory > Stock Transfers
5. Create test transfer → Confirm → Cancel (validates full workflow)
6. Verify audit logs show new inventory movements
```

## Support Contacts

- **Backend Issues:** Check `VexorionERP.Web.Tests` for integration test patterns
- **Frontend Issues:** Check `VexorionERP.UI/src/features/inventoryAdjustments` and `stockTransfers` pages
- **Database Issues:** Consult EF Core migration and service layer validation logic

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Staging Deploy + Validate | 1-2 hours | Run full test suite + smoke tests |
| Production Deploy | 15 minutes | Standard blue-green or rolling deployment |
| Post-Deploy Validation | 30 minutes | Confirm schema + test manual workflows |
| **Total** | **~2 hours** | Low-risk deployment (new tables, no schema changes) |

## Success Criteria

✅ Deployment is considered successful when:
- All 4 new tables exist in production
- Web tests pass against production (9/9)
- Users can create/confirm/cancel adjustment and transfer documents
- Inventory movements post correctly to `InventoryMovement` table
- Authorization rules enforce Inventory.View/Manage permissions
- Tenant isolation working (users see only own tenant data)

---

**Milestone A Deployment Ready:** 2026-04-25
