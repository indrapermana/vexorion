using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class VendorPaymentCommandServiceTests
{
    [Fact]
    public async Task Create_AllocatesPaymentAndUpdatesInvoiceBalance()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"vendor-payment-create-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var supplier = new Supplier { TenantId = tenantId, SupplierNumber = "SUP-001", Name = "Acme" };
        var invoice = new PurchaseInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "PI-100",
            SupplierId = supplier.Id,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 80m,
            TaxTotal = 20m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        };

        dbContext.Suppliers.Add(supplier);
        dbContext.PurchaseInvoices.Add(invoice);
        await dbContext.SaveChangesAsync();

        var service = new VendorPaymentCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateVendorPaymentRequest
        {
            SupplierId = supplier.Id,
            PurchaseInvoiceId = invoice.Id,
            PaymentDate = new DateOnly(2026, 4, 26),
            Amount = 100m,
            CurrencyCode = "usd",
            ReferenceNumber = "VP-001",
            PaymentMethod = "Wire",
        });

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(100m, result.Value.Amount);
        Assert.Equal("USD", result.Value.CurrencyCode);

        var persistedInvoice = await dbContext.PurchaseInvoices.FirstAsync(x => x.Id == invoice.Id);
        Assert.Equal(100m, persistedInvoice.PaidTotal);
        Assert.Equal(InvoiceStatus.Paid, persistedInvoice.Status);
        Assert.Equal(0m, persistedInvoice.BalanceDue);

        var persistedPayment = await dbContext.VendorPayments.FirstAsync(x => x.Id == result.Value.Id);
        Assert.Equal(supplier.Id, persistedPayment.SupplierId);
        Assert.Equal(invoice.Id, persistedPayment.PurchaseInvoiceId);
    }

    [Fact]
    public async Task Create_WithSupplierMismatch_ReturnsFailure()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"vendor-payment-mismatch-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var supplierA = new Supplier { TenantId = tenantId, SupplierNumber = "SUP-A", Name = "A" };
        var supplierB = new Supplier { TenantId = tenantId, SupplierNumber = "SUP-B", Name = "B" };
        var invoice = new PurchaseInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "PI-101",
            SupplierId = supplierA.Id,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        };

        dbContext.Suppliers.AddRange(supplierA, supplierB);
        dbContext.PurchaseInvoices.Add(invoice);
        await dbContext.SaveChangesAsync();

        var service = new VendorPaymentCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateVendorPaymentRequest
        {
            SupplierId = supplierB.Id,
            PurchaseInvoiceId = invoice.Id,
            PaymentDate = new DateOnly(2026, 4, 26),
            Amount = 50m,
            CurrencyCode = "USD",
        });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal("Purchase invoice does not belong to the specified supplier.", result.ErrorMessage);
    }
}
