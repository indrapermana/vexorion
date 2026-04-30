using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class InvoiceCommandServiceTests
{
    private static (AppDbContext db, InvoiceCommandService svc, Guid tenantId) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new InvoiceCommandService(db, new FixedTenantProvider(tid));
        return (db, svc, tid);
    }

    private static (AppDbContext db, InvoiceCommandService svc, Guid tenantId) BuildNoTenant(string? dbName = null)
    {
        var tid = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new InvoiceCommandService(db, new FixedTenantProvider(null));
        return (db, svc, tid);
    }

    private static CreateInvoiceRequest ValidCreate(Guid customerId, string number = "INV-001") => new()
    {
        InvoiceNumber = number,
        CustomerId = customerId,
        InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
        DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
        CurrencyCode = "usd",
        AmountPaid = 0,
    };

    private static UpdateInvoiceRequest ValidUpdate(Guid customerId, string number = "INV-001") => new()
    {
        InvoiceNumber = number,
        CustomerId = customerId,
        InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
        DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
        CurrencyCode = "eur",
        AmountPaid = 0,
        IsActive = true,
    };

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var (db, svc, _) = BuildNoTenant();
        var result = await svc.CreateAsync(ValidCreate(Guid.NewGuid()));
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_CustomerNotFound_Returns400()
    {
        var (db, svc, _) = Build();
        var result = await svc.CreateAsync(ValidCreate(Guid.NewGuid()));
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal("Customer not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task Create_DuplicateInvoiceNumber_Returns409()
    {
        var (db, svc, tenantId) = Build();
        var customerId = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-001", Name = "Acme" });
        db.Invoices.Add(new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, InvoiceNumber = "INV-001", CustomerId = customerId, InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow), DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), CurrencyCode = "USD" });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate(customerId, "inv-001"));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_NormalizesFieldsAndSaves()
    {
        var (db, svc, tenantId) = Build();
        var customerId = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-001", Name = "Acme" });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate(customerId, "inv-123"));

        Assert.True(result.Succeeded);
        var invoice = db.Invoices.Single();
        Assert.Equal("INV-123", invoice.InvoiceNumber);
        Assert.Equal("USD", invoice.CurrencyCode);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var (db, svc, tenantId) = Build();
        var customerId = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-001", Name = "Acme" });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(Guid.NewGuid(), ValidUpdate(customerId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateInvoiceNumber_Returns409()
    {
        var (db, svc, tenantId) = Build();
        var customerId = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-001", Name = "Acme" });

        var invoice1 = Guid.NewGuid();
        db.Invoices.Add(new Invoice { Id = invoice1, TenantId = tenantId, InvoiceNumber = "INV-001", CustomerId = customerId, InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow), DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), CurrencyCode = "USD" });
        db.Invoices.Add(new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, InvoiceNumber = "INV-002", CustomerId = customerId, InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow), DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), CurrencyCode = "USD" });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(invoice1, ValidUpdate(customerId, "inv-002"));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_RecalculatesTotals()
    {
        var (db, svc, tenantId) = Build();
        var customerId = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-001", Name = "Acme" });

        var invoiceId = Guid.NewGuid();
        db.Invoices.Add(new Invoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "INV-001",
            CustomerId = customerId,
            InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            CurrencyCode = "USD",
            Lines =
            [
                new InvoiceLine { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = Guid.NewGuid(), Quantity = 2, UnitPrice = 10, TaxAmount = 3, IsActive = true },
                new InvoiceLine { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = Guid.NewGuid(), Quantity = 1, UnitPrice = 5, TaxAmount = 1, IsActive = false }
            ]
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(invoiceId, ValidUpdate(customerId, "inv-001"));

        Assert.True(result.Succeeded);
        var invoice = db.Invoices.Single(x => x.Id == invoiceId);
        Assert.Equal(20, invoice.Subtotal);
        Assert.Equal(3, invoice.TaxAmount);
        Assert.Equal(23, invoice.TotalAmount);
        Assert.Equal("INV-001", invoice.InvoiceNumber);
        Assert.Equal("EUR", invoice.CurrencyCode);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (db, svc, _) = Build();
        var result = await svc.DeleteAsync(Guid.NewGuid());
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesInvoice()
    {
        var (db, svc, tenantId) = Build();
        var customerId = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-001", Name = "Acme" });

        var invoiceId = Guid.NewGuid();
        db.Invoices.Add(new Invoice { Id = invoiceId, TenantId = tenantId, InvoiceNumber = "INV-001", CustomerId = customerId, InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow), DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)), CurrencyCode = "USD" });
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(invoiceId);

        Assert.True(result.Succeeded);
        Assert.Empty(db.Invoices);
    }
}
