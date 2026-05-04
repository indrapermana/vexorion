using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class CustomerImportExecutor(AppDbContext dbContext) : IImportExecutor<Customer>
{
    public string ImportType => "customer";

    public async Task<ImportExecuteResult> ExecuteAsync(Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        int inserted = 0, updated = 0;

        var existingNumbers = await dbContext.Customers
            .Where(c => c.TenantId == tenantId)
            .Select(c => new { c.CustomerNumber, c.Id })
            .ToDictionaryAsync(c => c.CustomerNumber, c => c.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var row in rows)
        {
            var v = row.Values;
            try
            {
                var number = v.GetValueOrDefault("CustomerNumber", string.Empty).Trim();
                var name = v.GetValueOrDefault("Name", string.Empty).Trim();

                if (existingNumbers.TryGetValue(number, out var existingId))
                {
                    var entity = await dbContext.Customers.FindAsync([existingId], cancellationToken);
                    if (entity is null) continue;

                    entity.Name = name;
                    entity.Email = v.GetValueOrDefault("Email")?.Trim();
                    entity.PhoneNumber = v.GetValueOrDefault("PhoneNumber")?.Trim();
                    entity.BillingAddress = v.GetValueOrDefault("BillingAddress")?.Trim();
                    updated++;
                }
                else
                {
                    var entity = new Customer
                    {
                        TenantId = tenantId,
                        CustomerNumber = number,
                        Name = name,
                        Email = v.GetValueOrDefault("Email")?.Trim(),
                        PhoneNumber = v.GetValueOrDefault("PhoneNumber")?.Trim(),
                        BillingAddress = v.GetValueOrDefault("BillingAddress")?.Trim(),
                    };
                    dbContext.Customers.Add(entity);
                    inserted++;
                }
            }
            catch (Exception ex)
            {
                errors.Add($"Row {row.RowNumber}: {ex.Message}");
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new ImportExecuteResult(inserted, updated, 0, errors);
    }
}
