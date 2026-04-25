using VexorionERP.Models.Enums;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class SalesInvoiceQueryServiceTests
{
    [Fact]
    public async Task GetAll_WithOutstandingOnly_ReturnsOnlyInvoicesWithBalance()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"sales-invoice-query-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var customer = new Customer
        {
            TenantId = tenantId,
            CustomerNumber = "CUST-OUT",
            Name = "Outstanding Customer"
        };

        dbContext.Customers.Add(customer);
        dbContext.SalesInvoices.AddRange(
            new SalesInvoice
            {
                TenantId = tenantId,
                InvoiceNumber = "SI-OUT",
                CustomerId = customer.Id,
                InvoiceDate = new DateOnly(2026, 4, 25),
                DueDate = new DateOnly(2026, 5, 25),
                CurrencyCode = "USD",
                Status = InvoiceStatus.PartiallyPaid,
                Subtotal = 100m,
                TaxTotal = 0m,
                GrandTotal = 100m,
                PaidTotal = 40m,
            },
            new SalesInvoice
            {
                TenantId = tenantId,
                InvoiceNumber = "SI-PAID",
                CustomerId = customer.Id,
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

        var service = new SalesInvoiceQueryService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.GetAllAsync(outstandingOnly: true);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Single(result.Value);
        Assert.Equal("SI-OUT", result.Value.First().InvoiceNumber);
    }
}