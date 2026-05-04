using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

/// <summary>
/// Insert-only executor — transactional documents cannot be updated via import.
/// Rows whose OrderNumber already exists are skipped.
/// </summary>
public class PurchaseOrderImportExecutor(AppDbContext dbContext) : IImportExecutor<PurchaseOrder>
{
    public string ImportType => "purchase-order";

    public async Task<ImportExecuteResult> ExecuteAsync(Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        int inserted = 0, skipped = 0;

        var existingOrderNumbers = (await dbContext.PurchaseOrders
            .Where(o => o.TenantId == tenantId)
            .Select(o => o.OrderNumber)
            .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var supplierLookup = await dbContext.Suppliers
            .Where(s => s.TenantId == tenantId)
            .ToDictionaryAsync(s => s.SupplierNumber, s => s.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var warehouseLookup = await dbContext.Warehouses
            .Where(w => w.TenantId == tenantId)
            .ToDictionaryAsync(w => w.Code, w => w.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var row in rows)
        {
            var v = row.Values;
            try
            {
                var orderNumber = v.GetValueOrDefault("OrderNumber", string.Empty).Trim();

                if (existingOrderNumbers.Contains(orderNumber))
                {
                    skipped++;
                    continue;
                }

                if (!DateOnly.TryParse(v.GetValueOrDefault("OrderDate"), out var orderDate))
                    orderDate = DateOnly.FromDateTime(DateTime.UtcNow);

                var supplierNumber = v.GetValueOrDefault("SupplierNumber", string.Empty).Trim();
                if (!supplierLookup.TryGetValue(supplierNumber, out var supplierId))
                {
                    errors.Add($"Row {row.RowNumber}: Supplier '{supplierNumber}' not found.");
                    continue;
                }

                var warehouseCode = v.GetValueOrDefault("WarehouseCode", string.Empty).Trim();
                if (!warehouseLookup.TryGetValue(warehouseCode, out var warehouseId))
                {
                    errors.Add($"Row {row.RowNumber}: Warehouse '{warehouseCode}' not found.");
                    continue;
                }

                var entity = new PurchaseOrder
                {
                    TenantId = tenantId,
                    OrderNumber = orderNumber,
                    SupplierId = supplierId,
                    WarehouseId = warehouseId,
                    OrderDate = orderDate,
                    ExpectedReceiptDate = orderDate.AddDays(14),
                    CurrencyCode = v.GetValueOrDefault("CurrencyCode", "USD").Trim(),
                    Status = DocumentStatus.Draft,
                };
                dbContext.PurchaseOrders.Add(entity);
                inserted++;
            }
            catch (Exception ex)
            {
                errors.Add($"Row {row.RowNumber}: {ex.Message}");
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new ImportExecuteResult(inserted, 0, skipped, errors);
    }
}
