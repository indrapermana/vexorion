using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public class ImportValidationEngine(AppDbContext dbContext) : IImportValidationEngine
{
    public async Task<IReadOnlyCollection<ImportValidationErrorResponse>> ValidateAsync(
        ImportValidationContext context,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<ImportValidationErrorResponse>();

        ApplySchemaValidation(context, errors);
        ApplyTypeConversionValidation(context, errors);
        await ApplyReferenceExistenceValidationAsync(context, errors, cancellationToken);
        ApplyBusinessRuleValidation(context, errors);

        return errors;
    }

    private static void ApplySchemaValidation(ImportValidationContext context, List<ImportValidationErrorResponse> errors)
    {
        if (context.Workbook.Headers.Count == 0)
        {
            errors.Add(new ImportValidationErrorResponse
            {
                RowNumber = 1,
                ColumnName = "Header",
                Category = "Schema",
                Message = "Header row is missing.",
            });
            return;
        }

        var missingColumns = context.ExpectedColumns.Except(context.Workbook.Headers, StringComparer.OrdinalIgnoreCase).ToArray();
        if (missingColumns.Length > 0)
        {
            errors.Add(new ImportValidationErrorResponse
            {
                RowNumber = 1,
                ColumnName = "Header",
                Category = "Schema",
                Message = $"Missing required columns: {string.Join(", ", missingColumns)}",
            });
        }
    }

    private static void ApplyTypeConversionValidation(ImportValidationContext context, List<ImportValidationErrorResponse> errors)
    {
        foreach (var row in context.Workbook.Rows)
        {
            if (context.ImportType.Equals("product", StringComparison.OrdinalIgnoreCase)
                && row.Values.TryGetValue("ListPrice", out var listPrice)
                && !string.IsNullOrWhiteSpace(listPrice)
                && !decimal.TryParse(listPrice, out _))
            {
                errors.Add(new ImportValidationErrorResponse
                {
                    RowNumber = row.RowNumber,
                    ColumnName = "ListPrice",
                    Category = "TypeConversion",
                    Message = "ListPrice must be a valid decimal number.",
                });
            }

            if ((context.ImportType.Equals("sales-order", StringComparison.OrdinalIgnoreCase)
                 || context.ImportType.Equals("purchase-order", StringComparison.OrdinalIgnoreCase))
                && row.Values.TryGetValue("OrderDate", out var orderDate)
                && !string.IsNullOrWhiteSpace(orderDate)
                && !DateOnly.TryParse(orderDate, out _))
            {
                errors.Add(new ImportValidationErrorResponse
                {
                    RowNumber = row.RowNumber,
                    ColumnName = "OrderDate",
                    Category = "TypeConversion",
                    Message = "OrderDate must be a valid date.",
                });
            }
        }
    }

    private async Task ApplyReferenceExistenceValidationAsync(
        ImportValidationContext context,
        List<ImportValidationErrorResponse> errors,
        CancellationToken cancellationToken)
    {
        if (context.ImportType.Equals("sales-order", StringComparison.OrdinalIgnoreCase))
        {
            var existingCustomerCodes = await dbContext.Customers
                .AsNoTracking()
                .Where(x => x.TenantId == context.TenantId)
                .Select(x => x.CustomerNumber.ToUpper())
                .ToListAsync(cancellationToken);

            var existingWarehouseCodes = await dbContext.Warehouses
                .AsNoTracking()
                .Where(x => x.TenantId == context.TenantId)
                .Select(x => x.Code.ToUpper())
                .ToListAsync(cancellationToken);

            var customerCodeSet = existingCustomerCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var warehouseCodeSet = existingWarehouseCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var row in context.Workbook.Rows)
            {
                var customerNumber = row.Values.GetValueOrDefault("CustomerNumber")?.Trim();
                if (!string.IsNullOrWhiteSpace(customerNumber) && !customerCodeSet.Contains(customerNumber.ToUpperInvariant()))
                {
                    errors.Add(new ImportValidationErrorResponse
                    {
                        RowNumber = row.RowNumber,
                        ColumnName = "CustomerNumber",
                        Category = "ReferenceExistence",
                        Message = $"Customer number '{customerNumber}' does not exist.",
                    });
                }

                var warehouseCode = row.Values.GetValueOrDefault("WarehouseCode")?.Trim();
                if (!string.IsNullOrWhiteSpace(warehouseCode) && !warehouseCodeSet.Contains(warehouseCode.ToUpperInvariant()))
                {
                    errors.Add(new ImportValidationErrorResponse
                    {
                        RowNumber = row.RowNumber,
                        ColumnName = "WarehouseCode",
                        Category = "ReferenceExistence",
                        Message = $"Warehouse code '{warehouseCode}' does not exist.",
                    });
                }
            }
        }

        if (context.ImportType.Equals("purchase-order", StringComparison.OrdinalIgnoreCase))
        {
            var existingSupplierCodes = await dbContext.Suppliers
                .AsNoTracking()
                .Where(x => x.TenantId == context.TenantId)
                .Select(x => x.SupplierNumber.ToUpper())
                .ToListAsync(cancellationToken);

            var existingWarehouseCodes = await dbContext.Warehouses
                .AsNoTracking()
                .Where(x => x.TenantId == context.TenantId)
                .Select(x => x.Code.ToUpper())
                .ToListAsync(cancellationToken);

            var supplierCodeSet = existingSupplierCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var warehouseCodeSet = existingWarehouseCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var row in context.Workbook.Rows)
            {
                var supplierNumber = row.Values.GetValueOrDefault("SupplierNumber")?.Trim();
                if (!string.IsNullOrWhiteSpace(supplierNumber) && !supplierCodeSet.Contains(supplierNumber.ToUpperInvariant()))
                {
                    errors.Add(new ImportValidationErrorResponse
                    {
                        RowNumber = row.RowNumber,
                        ColumnName = "SupplierNumber",
                        Category = "ReferenceExistence",
                        Message = $"Supplier number '{supplierNumber}' does not exist.",
                    });
                }

                var warehouseCode = row.Values.GetValueOrDefault("WarehouseCode")?.Trim();
                if (!string.IsNullOrWhiteSpace(warehouseCode) && !warehouseCodeSet.Contains(warehouseCode.ToUpperInvariant()))
                {
                    errors.Add(new ImportValidationErrorResponse
                    {
                        RowNumber = row.RowNumber,
                        ColumnName = "WarehouseCode",
                        Category = "ReferenceExistence",
                        Message = $"Warehouse code '{warehouseCode}' does not exist.",
                    });
                }
            }
        }

        if (context.ImportType.Equals("product", StringComparison.OrdinalIgnoreCase))
        {
            var existingCategoryCodes = await dbContext.ProductCategories
                .AsNoTracking()
                .Where(x => x.TenantId == context.TenantId)
                .Select(x => x.Name.ToUpper())
                .ToListAsync(cancellationToken);

            var categoryCodeSet = existingCategoryCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var row in context.Workbook.Rows)
            {
                var categoryName = row.Values.GetValueOrDefault("CategoryName")?.Trim();
                if (!string.IsNullOrWhiteSpace(categoryName) && !categoryCodeSet.Contains(categoryName.ToUpperInvariant()))
                {
                    errors.Add(new ImportValidationErrorResponse
                    {
                        RowNumber = row.RowNumber,
                        ColumnName = "CategoryName",
                        Category = "ReferenceExistence",
                        Message = $"Category name '{categoryName}' does not exist.",
                    });
                }
            }
        }
    }

    private static void ApplyBusinessRuleValidation(ImportValidationContext context, List<ImportValidationErrorResponse> errors)
    {
        var requiredColumns = context.ImportType.ToLowerInvariant() switch
        {
            "customer" => new[] { "CustomerNumber", "Name" },
            "supplier" => new[] { "SupplierNumber", "Name" },
            "product" => new[] { "Sku", "Name", "CategoryName" },
            "sales-order" => new[] { "OrderNumber", "CustomerNumber", "WarehouseCode" },
            "purchase-order" => new[] { "OrderNumber", "SupplierNumber", "WarehouseCode" },
            _ => []
        };

        foreach (var row in context.Workbook.Rows)
        {
            foreach (var requiredColumn in requiredColumns)
            {
                if (!row.Values.TryGetValue(requiredColumn, out var value) || string.IsNullOrWhiteSpace(value))
                {
                    errors.Add(new ImportValidationErrorResponse
                    {
                        RowNumber = row.RowNumber,
                        ColumnName = requiredColumn,
                        Category = "BusinessRule",
                        Message = $"{requiredColumn} is required.",
                    });
                }
            }
        }

        var keyColumn = context.ImportType.ToLowerInvariant() switch
        {
            "customer" => "CustomerNumber",
            "supplier" => "SupplierNumber",
            "product" => "Sku",
            "sales-order" => "OrderNumber",
            "purchase-order" => "OrderNumber",
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(keyColumn))
        {
            return;
        }

        var duplicateGroups = context.Workbook.Rows
            .Select(row => new
            {
                row.RowNumber,
                Value = row.Values.GetValueOrDefault(keyColumn)?.Trim().ToUpperInvariant(),
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Value))
            .GroupBy(x => x.Value, StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Count() > 1)
            .ToArray();

        foreach (var group in duplicateGroups)
        {
            foreach (var item in group)
            {
                errors.Add(new ImportValidationErrorResponse
                {
                    RowNumber = item.RowNumber,
                    ColumnName = keyColumn,
                    Category = "BusinessRule",
                    Message = $"Duplicate {keyColumn} '{group.Key}' within the same import file.",
                });
            }
        }
    }
}
