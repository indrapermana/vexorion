using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductImportExecutor(AppDbContext dbContext) : IImportExecutor<Product>
{
    public string ImportType => "product";

    public async Task<ImportExecuteResult> ExecuteAsync(Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        int inserted = 0, updated = 0;

        var existingSkus = await dbContext.Products
            .Where(p => p.TenantId == tenantId)
            .Select(p => new { p.Sku, p.Id })
            .ToDictionaryAsync(p => p.Sku, p => p.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var categoryLookup = await dbContext.ProductCategories
            .Where(c => c.TenantId == tenantId)
            .ToDictionaryAsync(c => c.Name, c => c.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var row in rows)
        {
            var v = row.Values;
            try
            {
                var sku = v.GetValueOrDefault("Sku", string.Empty).Trim();
                var name = v.GetValueOrDefault("Name", string.Empty).Trim();
                var unit = v.GetValueOrDefault("Unit", "EA").Trim();
                decimal listPrice = 0;
                if (v.TryGetValue("ListPrice", out var priceStr))
                    decimal.TryParse(priceStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out listPrice);

                var categoryName = v.GetValueOrDefault("CategoryName", string.Empty).Trim();

                if (existingSkus.TryGetValue(sku, out var existingId))
                {
                    var entity = await dbContext.Products.FindAsync([existingId], cancellationToken);
                    if (entity is null) continue;

                    entity.Name = name;
                    entity.UnitOfMeasure = unit;
                    entity.SalesPrice = listPrice;
                    updated++;

                    await UpsertCategoryAssignmentAsync(entity.Id, tenantId, categoryName, categoryLookup, cancellationToken);
                }
                else
                {
                    var entity = new Product
                    {
                        TenantId = tenantId,
                        Sku = sku,
                        Name = name,
                        UnitOfMeasure = unit,
                        SalesPrice = listPrice,
                    };
                    dbContext.Products.Add(entity);
                    await dbContext.SaveChangesAsync(cancellationToken);

                    await UpsertCategoryAssignmentAsync(entity.Id, tenantId, categoryName, categoryLookup, cancellationToken);
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

    private async Task UpsertCategoryAssignmentAsync(
        Guid productId,
        Guid tenantId,
        string categoryName,
        Dictionary<string, Guid> categoryLookup,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(categoryName) || !categoryLookup.TryGetValue(categoryName, out var categoryId))
            return;

        var exists = await dbContext.ProductCategoryAssignments
            .AnyAsync(a => a.ProductId == productId && a.ProductCategoryId == categoryId, cancellationToken);

        if (!exists)
        {
            dbContext.ProductCategoryAssignments.Add(new ProductCategoryAssignment
            {
                TenantId = tenantId,
                ProductId = productId,
                ProductCategoryId = categoryId,
            });
        }
    }
}
