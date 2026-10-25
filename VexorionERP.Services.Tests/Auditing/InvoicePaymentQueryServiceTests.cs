using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class InvoicePaymentQueryServiceTests
{
    [Fact]
    public async Task CustomerPayments_GetForInvoice_ReturnsOnlyMatchingTenantInvoiceAllocations()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, $"customer-payment-query-{Guid.NewGuid()}");
        dbContext.CustomerPayments.AddRange(
            new CustomerPayment { TenantId = tenantId, SalesInvoiceId = invoiceId, PaymentDate = new DateOnly(2026, 10, 20), Amount = 40m, ReferenceNumber = "PAY-1" },
            new CustomerPayment { TenantId = tenantId, SalesInvoiceId = Guid.NewGuid(), PaymentDate = new DateOnly(2026, 10, 21), Amount = 60m, ReferenceNumber = "PAY-2" },
            new CustomerPayment { TenantId = otherTenantId, SalesInvoiceId = invoiceId, PaymentDate = new DateOnly(2026, 10, 22), Amount = 80m, ReferenceNumber = "PAY-3" });
        await dbContext.SaveChangesAsync();

        var service = new CustomerPaymentQueryService(new FixedTenantProvider(tenantId));
        var result = await service.GetForInvoiceAsync(invoiceId, dbContext);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task VendorPayments_GetForInvoice_ReturnsOnlyMatchingTenantInvoiceAllocations()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, $"vendor-payment-query-{Guid.NewGuid()}");
        dbContext.VendorPayments.AddRange(
            new VendorPayment { TenantId = tenantId, PurchaseInvoiceId = invoiceId, PaymentDate = new DateOnly(2026, 10, 20), Amount = 40m, ReferenceNumber = "VPM-1" },
            new VendorPayment { TenantId = tenantId, PurchaseInvoiceId = Guid.NewGuid(), PaymentDate = new DateOnly(2026, 10, 21), Amount = 60m, ReferenceNumber = "VPM-2" },
            new VendorPayment { TenantId = otherTenantId, PurchaseInvoiceId = invoiceId, PaymentDate = new DateOnly(2026, 10, 22), Amount = 80m, ReferenceNumber = "VPM-3" });
        await dbContext.SaveChangesAsync();

        var service = new VendorPaymentQueryService(new FixedTenantProvider(tenantId));
        var result = await service.GetForInvoiceAsync(invoiceId, dbContext);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }
}