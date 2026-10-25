using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class FulfillmentOrderLineQueryTests
{
    [Fact]
    public async Task SalesOrderLines_IncludeShippedAndRemainingQuantities()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, $"sales-fulfillment-lines-{Guid.NewGuid()}");
        dbContext.SalesOrderLines.Add(new SalesOrderLine
        {
            TenantId = tenantId,
            SalesOrderId = orderId,
            ProductId = Guid.NewGuid(),
            Quantity = 12m,
            ShippedQuantity = 7m,
            UnitPrice = 5m,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineQueryService(new FixedTenantProvider(tenantId));
        var result = await service.GetAllForParentAsync(orderId, dbContext);

        Assert.True(result.Succeeded);
        var line = Assert.IsType<SalesOrderLineListItemResponse>(Assert.Single(result.Value!));
        Assert.Equal(7m, line.ShippedQuantity);
        Assert.Equal(5m, line.RemainingQuantity);
    }

    [Fact]
    public async Task PurchaseOrderLines_IncludeReceivedAndRemainingQuantities()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, $"purchase-fulfillment-lines-{Guid.NewGuid()}");
        dbContext.PurchaseOrderLines.Add(new PurchaseOrderLine
        {
            TenantId = tenantId,
            PurchaseOrderId = orderId,
            ProductId = Guid.NewGuid(),
            Quantity = 12m,
            ReceivedQuantity = 7m,
            UnitCost = 5m,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseOrderLineQueryService(new FixedTenantProvider(tenantId));
        var result = await service.GetAllForParentAsync(orderId, dbContext);

        Assert.True(result.Succeeded);
        var line = Assert.IsType<PurchaseOrderLineListItemResponse>(Assert.Single(result.Value!));
        Assert.Equal(7m, line.ReceivedQuantity);
        Assert.Equal(5m, line.RemainingQuantity);
    }
}