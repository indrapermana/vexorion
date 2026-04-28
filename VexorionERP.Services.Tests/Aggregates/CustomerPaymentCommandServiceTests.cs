using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class CustomerPaymentCommandServiceTests
{
    [Fact]
    public async Task Create_AllocatesPaymentAndUpdatesInvoiceBalance()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"customer-payment-create-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var customer = new Customer { TenantId = tenantId, CustomerNumber = "CUST-001", Name = "Aster" };
        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "SI-100",
            CustomerId = customer.Id,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        };

        dbContext.Customers.Add(customer);
        dbContext.SalesInvoices.Add(invoice);
        await dbContext.SaveChangesAsync();

        var service = new CustomerPaymentCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateCustomerPaymentRequest
        {
            CustomerId = customer.Id,
            SalesInvoiceId = invoice.Id,
            PaymentDate = new DateOnly(2026, 4, 26),
            Amount = 40m,
            CurrencyCode = "usd",
            ReferenceNumber = "PAY-001",
            PaymentMethod = "Bank Transfer",
        });

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(40m, result.Value.Amount);
        Assert.Equal("USD", result.Value.CurrencyCode);

        var persistedInvoice = await dbContext.SalesInvoices.FirstAsync(x => x.Id == invoice.Id);
        Assert.Equal(40m, persistedInvoice.PaidTotal);
        Assert.Equal(InvoiceStatus.PartiallyPaid, persistedInvoice.Status);
        Assert.Equal(60m, persistedInvoice.BalanceDue);

        var persistedPayment = await dbContext.CustomerPayments.FirstAsync(x => x.Id == result.Value.Id);
        Assert.Equal(customer.Id, persistedPayment.CustomerId);
        Assert.Equal(invoice.Id, persistedPayment.SalesInvoiceId);
    }

    [Fact]
    public async Task Create_WithOverAllocation_ReturnsFailure()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"customer-payment-overalloc-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var customer = new Customer { TenantId = tenantId, CustomerNumber = "CUST-002", Name = "Brook" };
        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "SI-101",
            CustomerId = customer.Id,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 90m,
        };

        dbContext.Customers.Add(customer);
        dbContext.SalesInvoices.Add(invoice);
        await dbContext.SaveChangesAsync();

        var service = new CustomerPaymentCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateCustomerPaymentRequest
        {
            CustomerId = customer.Id,
            SalesInvoiceId = invoice.Id,
            PaymentDate = new DateOnly(2026, 4, 26),
            Amount = 20m,
            CurrencyCode = "USD",
        });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal("Payment allocation exceeds the remaining balance.", result.ErrorMessage);
    }
}
