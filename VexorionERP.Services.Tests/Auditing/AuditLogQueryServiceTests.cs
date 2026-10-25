using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class AuditLogQueryServiceTests
{
    [Fact]
    public async Task GetAsync_WithEntityId_ReturnsOnlyMatchingEntityWithinCurrentTenant()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, $"audit-query-{Guid.NewGuid()}");
        dbContext.AuditLogs.AddRange(
            new AuditLog { TenantId = tenantId, EventType = "invoice.updated", EntityName = "SalesInvoice", EntityId = "invoice-1" },
            new AuditLog { TenantId = tenantId, EventType = "invoice.updated", EntityName = "SalesInvoice", EntityId = "invoice-2" },
            new AuditLog { TenantId = tenantId, EventType = "order.updated", EntityName = "SalesOrder", EntityId = "invoice-1" },
            new AuditLog { TenantId = otherTenantId, EventType = "invoice.updated", EntityName = "SalesInvoice", EntityId = "invoice-1" });
        await dbContext.SaveChangesAsync();

        var service = new AuditLogQueryService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.GetAsync(null, "SalesInvoice", "invoice-1", null, null, 1, 50);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        var item = Assert.Single(result.Value.Items);
        Assert.Equal("SalesInvoice", item.EntityName);
        Assert.Equal("invoice-1", item.EntityId);
    }
}