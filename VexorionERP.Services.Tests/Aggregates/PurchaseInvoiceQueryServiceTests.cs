using VexorionERP.Models.Enums;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class PurchaseInvoiceQueryServiceTests
{
    [Fact]
    public async Task GetAll_WithOutstandingOnly_ReturnsOnlyInvoicesWithBalance()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"purchase-invoice-query-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var supplier = new Supplier
        {
            TenantId = tenantId,
            SupplierNumber = "SUP-OUT",
            Name = "Outstanding Supplier"
        };

        dbContext.Suppliers.Add(supplier);
        dbContext.PurchaseInvoices.AddRange(
            new PurchaseInvoice
            {
                TenantId = tenantId,
                InvoiceNumber = "PI-OUT",
                SupplierId = supplier.Id,
                InvoiceDate = new DateOnly(2026, 4, 25),
                DueDate = new DateOnly(2026, 5, 25),
                CurrencyCode = "USD",
                Status = InvoiceStatus.PartiallyPaid,
                Subtotal = 100m,
                TaxTotal = 0m,
                GrandTotal = 100m,
                PaidTotal = 10m,
            },
            new PurchaseInvoice
            {
                TenantId = tenantId,
                InvoiceNumber = "PI-PAID",
                SupplierId = supplier.Id,
                InvoiceDate = new DateOnly(2026, 4, 20),
                DueDate = new DateOnly(2026, 5, 20),
                CurrencyCode = "USD",
                Status = InvoiceStatus.Paid,
                Subtotal = 200m,
                TaxTotal = 0m,
                GrandTotal = 200m,
                PaidTotal = 200m,
            });

        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceQueryService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.GetAllAsync(outstandingOnly: true);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Single(result.Value);
        Assert.Equal("PI-OUT", result.Value.First().InvoiceNumber);
    }
}