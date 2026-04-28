using Microsoft.EntityFrameworkCore;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class InvoiceApprovalServiceTests
{
    [Fact]
    public async Task RequestSalesInvoiceApproval_CreatesPendingApproval()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-APP-1",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new InvoiceApprovalService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.RequestSalesInvoiceApprovalAsync(invoiceId, Guid.NewGuid(), "Submit for approval");

        Assert.True(result.Succeeded);
        var pending = await dbContext.DocumentApprovals.SingleAsync(x => x.DocumentType == nameof(SalesInvoice) && x.DocumentId == invoiceId);
        Assert.Equal(ApprovalStatus.Pending, pending.Status);
    }

    [Fact]
    public async Task ApproveSalesInvoice_ChangesStatusToIssued()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-2", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-APP-2",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new InvoiceApprovalService(dbContext, new FixedTenantProvider(tenantId));
        await service.RequestSalesInvoiceApprovalAsync(invoiceId, Guid.NewGuid(), null);

        var result = await service.ApproveSalesInvoiceAsync(invoiceId, Guid.NewGuid(), "Approved");

        Assert.True(result.Succeeded);
        Assert.Equal(InvoiceStatus.Issued, result.Value!.Status);

        var approval = await dbContext.DocumentApprovals.SingleAsync(x => x.DocumentType == nameof(SalesInvoice) && x.DocumentId == invoiceId);
        Assert.Equal(ApprovalStatus.Approved, approval.Status);
    }

    [Fact]
    public async Task RejectPurchaseInvoice_MarksApprovalRejected_LeavesInvoiceDraft()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-APP-1",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new InvoiceApprovalService(dbContext, new FixedTenantProvider(tenantId));
        await service.RequestPurchaseInvoiceApprovalAsync(invoiceId, Guid.NewGuid(), null);

        var result = await service.RejectPurchaseInvoiceAsync(invoiceId, Guid.NewGuid(), "Need correction");

        Assert.True(result.Succeeded);
        Assert.Equal(InvoiceStatus.Draft, result.Value!.Status);

        var approval = await dbContext.DocumentApprovals.SingleAsync(x => x.DocumentType == nameof(PurchaseInvoice) && x.DocumentId == invoiceId);
        Assert.Equal(ApprovalStatus.Rejected, approval.Status);
    }

    [Fact]
    public async Task RequestSalesInvoiceApproval_ForNonDraftInvoice_ReturnsBadRequest()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-3", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-APP-3",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
        });
        await dbContext.SaveChangesAsync();

        var service = new InvoiceApprovalService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.RequestSalesInvoiceApprovalAsync(invoiceId, Guid.NewGuid(), null);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }
}
