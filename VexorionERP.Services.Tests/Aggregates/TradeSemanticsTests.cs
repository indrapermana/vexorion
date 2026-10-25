using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class TradeSemanticsTests
{
    [Theory]
    [InlineData(typeof(SalesOrderLine), nameof(SalesOrderLine.Version))]
    [InlineData(typeof(PurchaseOrderLine), nameof(PurchaseOrderLine.Version))]
    [InlineData(typeof(SalesInvoice), nameof(SalesInvoice.Version))]
    [InlineData(typeof(PurchaseInvoice), nameof(PurchaseInvoice.Version))]
    public void FulfillmentAndAllocationAggregates_UseOptimisticConcurrency(Type entityType, string propertyName)
    {
        using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());

        var property = dbContext.Model.FindEntityType(entityType)!.FindProperty(propertyName);

        Assert.NotNull(property);
        Assert.True(property!.IsConcurrencyToken);
    }

    [Fact]
    public async Task ConfirmedSalesOrder_HeaderMutation_IsRejectedAsConflict()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main" });
        var order = new SalesOrder
        {
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-1",
            OrderDate = new DateOnly(2026, 10, 25),
            RequiredDate = new DateOnly(2026, 10, 26),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
        };
        dbContext.SalesOrders.Add(order);
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(order.Id, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-CHANGED",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = order.OrderDate,
            RequiredDate = order.RequiredDate,
            CurrencyCode = order.CurrencyCode,
            Status = DocumentStatus.Confirmed,
            IsActive = true,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }
}
