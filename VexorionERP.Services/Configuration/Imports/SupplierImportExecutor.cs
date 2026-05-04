using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class SupplierImportExecutor(AppDbContext dbContext) : IImportExecutor<Supplier>
{
    public string ImportType => "supplier";

    public async Task<ImportExecuteResult> ExecuteAsync(Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        int inserted = 0, updated = 0;

        var existingNumbers = await dbContext.Suppliers
            .Where(s => s.TenantId == tenantId)
            .Select(s => new { s.SupplierNumber, s.Id })
            .ToDictionaryAsync(s => s.SupplierNumber, s => s.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var row in rows)
        {
            var v = row.Values;
            try
            {
                var number = v.GetValueOrDefault("SupplierNumber", string.Empty).Trim();
                var name = v.GetValueOrDefault("Name", string.Empty).Trim();

                if (existingNumbers.TryGetValue(number, out var existingId))
                {
                    var entity = await dbContext.Suppliers.FindAsync([existingId], cancellationToken);
                    if (entity is null) continue;

                    entity.Name = name;
                    entity.Email = v.GetValueOrDefault("Email")?.Trim();
                    entity.PhoneNumber = v.GetValueOrDefault("PhoneNumber")?.Trim();
                    entity.Address = v.GetValueOrDefault("Address")?.Trim();
                    updated++;
                }
                else
                {
                    var entity = new Supplier
                    {
                        TenantId = tenantId,
                        SupplierNumber = number,
                        Name = name,
                        Email = v.GetValueOrDefault("Email")?.Trim(),
                        PhoneNumber = v.GetValueOrDefault("PhoneNumber")?.Trim(),
                        Address = v.GetValueOrDefault("Address")?.Trim(),
                    };
                    dbContext.Suppliers.Add(entity);
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
