using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

/// <summary>
/// Insert-only executor — transactional documents cannot be updated via import.
/// Rows whose OrderNumber already exists are skipped.
/// </summary>
public class SalesOrderImportExecutor(AppDbContext dbContext) : IImportExecutor<SalesOrder>
{
    public string ImportType => "sales-order";

    public async Task<ImportExecuteResult> ExecuteAsync(Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        int inserted = 0, skipped = 0;

        var existingOrderNumbers = (await dbContext.SalesOrders
            .Where(o => o.TenantId == tenantId)
            .Select(o => o.OrderNumber)
            .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var customerLookup = await dbContext.Customers
            .Where(c => c.TenantId == tenantId)
            .ToDictionaryAsync(c => c.CustomerNumber, c => c.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

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

                var customerNumber = v.GetValueOrDefault("CustomerNumber", string.Empty).Trim();
                if (!customerLookup.TryGetValue(customerNumber, out var customerId))
                {
                    errors.Add($"Row {row.RowNumber}: Customer '{customerNumber}' not found.");
                    continue;
                }

                var warehouseCode = v.GetValueOrDefault("WarehouseCode", string.Empty).Trim();
                if (!warehouseLookup.TryGetValue(warehouseCode, out var warehouseId))
                {
                    errors.Add($"Row {row.RowNumber}: Warehouse '{warehouseCode}' not found.");
                    continue;
                }

                var entity = new SalesOrder
                {
                    TenantId = tenantId,
                    OrderNumber = orderNumber,
                    CustomerId = customerId,
                    WarehouseId = warehouseId,
                    OrderDate = orderDate,
                    RequiredDate = orderDate.AddDays(7),
                    CurrencyCode = v.GetValueOrDefault("CurrencyCode", "USD").Trim(),
                    Status = DocumentStatus.Draft,
                };
                dbContext.SalesOrders.Add(entity);
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
