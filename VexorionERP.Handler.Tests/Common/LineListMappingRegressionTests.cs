using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Common;

/// <summary>
/// Regression tests for line-list handlers where mapping from interface-typed collections
/// previously produced default-valued DTOs (Guid.Empty / 0 / false).
/// </summary>
public class LineListMappingRegressionTests
{
    [Fact]
    public async Task GetSalesOrderLinesQueryHandler_PreservesValues_FromInterfaceTypedCollection()
    {
        var expectedId = Guid.NewGuid();
        var expectedOrderId = Guid.NewGuid();
        var expectedProductId = Guid.NewGuid();

        var fakeQueryService = new FakeLineQueryService<SalesOrder, SalesOrderLine>
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesOrderLine>>>.Success(
            [
                new SalesOrderLineListItemTestResponse
                {
                    Id = expectedId,
                    SalesOrderId = expectedOrderId,
                    ProductId = expectedProductId,
                    Quantity = 3,
                    UnitPrice = 150.25m,
                    DiscountAmount = 5,
                    LineTotal = 445.75m,
                    IsActive = true,
                },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(fakeQueryService);
        var handler = new GetSalesOrderLinesQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetSalesOrderLinesQuery(expectedOrderId), CancellationToken.None);

        Assert.True(result.Succeeded);
        var line = Assert.Single(result.Value!);
        Assert.Equal(expectedId, line.Id);
        Assert.Equal(expectedOrderId, line.SalesOrderId);
        Assert.Equal(expectedProductId, line.ProductId);
        Assert.Equal(3, line.Quantity);
        Assert.Equal(150.25m, line.UnitPrice);
        Assert.Equal(5, line.DiscountAmount);
        Assert.Equal(445.75m, line.LineTotal);
        Assert.True(line.IsActive);
    }

    [Fact]
    public async Task GetPurchaseOrderLinesQueryHandler_PreservesValues_FromInterfaceTypedCollection()
    {
        var expectedId = Guid.NewGuid();
        var expectedOrderId = Guid.NewGuid();
        var expectedProductId = Guid.NewGuid();

        var fakeQueryService = new FakeLineQueryService<PurchaseOrder, PurchaseOrderLine>
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseOrderLine>>>.Success(
            [
                new PurchaseOrderLineListItemTestResponse
                {
                    Id = expectedId,
                    PurchaseOrderId = expectedOrderId,
                    ProductId = expectedProductId,
                    Quantity = 7,
                    UnitCost = 42.5m,
                    IsActive = true,
                },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(fakeQueryService);
        var handler = new GetPurchaseOrderLinesQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetPurchaseOrderLinesQuery(expectedOrderId), CancellationToken.None);

        Assert.True(result.Succeeded);
        var line = Assert.Single(result.Value!);
        Assert.Equal(expectedId, line.Id);
        Assert.Equal(expectedOrderId, line.PurchaseOrderId);
        Assert.Equal(expectedProductId, line.ProductId);
        Assert.Equal(7, line.Quantity);
        Assert.Equal(42.5m, line.UnitCost);
        Assert.True(line.IsActive);
    }

    [Fact]
    public async Task GetSalesInvoiceLinesQueryHandler_PreservesValues_FromInterfaceTypedCollection()
    {
        var expectedId = Guid.NewGuid();
        var expectedInvoiceId = Guid.NewGuid();
        var expectedProductId = Guid.NewGuid();

        var fakeQueryService = new FakeLineQueryService<SalesInvoice, SalesInvoiceLine>
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesInvoiceLine>>>.Success(
            [
                new SalesInvoiceLineListItemTestResponse
                {
                    Id = expectedId,
                    SalesInvoiceId = expectedInvoiceId,
                    ProductId = expectedProductId,
                    Quantity = 2,
                    UnitPrice = 88,
                    DiscountAmount = 3,
                    TaxAmount = 4.4m,
                    LineTotal = 177.4m,
                    IsActive = true,
                },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(fakeQueryService);
        var handler = new GetSalesInvoiceLinesQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetSalesInvoiceLinesQuery(expectedInvoiceId), CancellationToken.None);

        Assert.True(result.Succeeded);
        var line = Assert.Single(result.Value!);
        Assert.Equal(expectedId, line.Id);
        Assert.Equal(expectedInvoiceId, line.SalesInvoiceId);
        Assert.Equal(expectedProductId, line.ProductId);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(88, line.UnitPrice);
        Assert.Equal(3, line.DiscountAmount);
        Assert.Equal(4.4m, line.TaxAmount);
        Assert.Equal(177.4m, line.LineTotal);
        Assert.True(line.IsActive);
    }

    [Fact]
    public async Task GetPurchaseInvoiceLinesQueryHandler_PreservesValues_FromInterfaceTypedCollection()
    {
        var expectedId = Guid.NewGuid();
        var expectedInvoiceId = Guid.NewGuid();
        var expectedProductId = Guid.NewGuid();

        var fakeQueryService = new FakeLineQueryService<PurchaseInvoice, PurchaseInvoiceLine>
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseInvoiceLine>>>.Success(
            [
                new PurchaseInvoiceLineListItemTestResponse
                {
                    Id = expectedId,
                    PurchaseInvoiceId = expectedInvoiceId,
                    ProductId = expectedProductId,
                    Quantity = 11,
                    UnitCost = 12.2m,
                    DiscountAmount = 1.1m,
                    TaxAmount = 0.6m,
                    LineTotal = 133.7m,
                    IsActive = true,
                },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(fakeQueryService);
        var handler = new GetPurchaseInvoiceLinesQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetPurchaseInvoiceLinesQuery(expectedInvoiceId), CancellationToken.None);

        Assert.True(result.Succeeded);
        var line = Assert.Single(result.Value!);
        Assert.Equal(expectedId, line.Id);
        Assert.Equal(expectedInvoiceId, line.PurchaseInvoiceId);
        Assert.Equal(expectedProductId, line.ProductId);
        Assert.Equal(11, line.Quantity);
        Assert.Equal(12.2m, line.UnitCost);
        Assert.Equal(1.1m, line.DiscountAmount);
        Assert.Equal(0.6m, line.TaxAmount);
        Assert.Equal(133.7m, line.LineTotal);
        Assert.True(line.IsActive);
    }

    [Fact]
    public async Task GetInvoiceLinesQueryHandler_PreservesValues_FromInterfaceTypedCollection()
    {
        var expectedId = Guid.NewGuid();
        var expectedInvoiceId = Guid.NewGuid();
        var expectedProductId = Guid.NewGuid();

        var fakeQueryService = new FakeLineQueryService<Invoice, InvoiceLine>
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<InvoiceLine>>>.Success(
            [
                new InvoiceLineListItemTestResponse
                {
                    Id = expectedId,
                    InvoiceId = expectedInvoiceId,
                    ProductId = expectedProductId,
                    Quantity = 4,
                    UnitPrice = 21,
                    TaxAmount = 1,
                    LineTotal = 85,
                    IsActive = true,
                },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(fakeQueryService);
        var handler = new GetInvoiceLinesQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetInvoiceLinesQuery(expectedInvoiceId), CancellationToken.None);

        Assert.True(result.Succeeded);
        var line = Assert.Single(result.Value!);
        Assert.Equal(expectedId, line.Id);
        Assert.Equal(expectedInvoiceId, line.InvoiceId);
        Assert.Equal(expectedProductId, line.ProductId);
        Assert.Equal(4, line.Quantity);
        Assert.Equal(21, line.UnitPrice);
        Assert.Equal(1, line.TaxAmount);
        Assert.Equal(85, line.LineTotal);
        Assert.True(line.IsActive);
    }

    private static ServiceProvider BuildServiceProvider<TParent, TLine>(ILineQueryService<TParent, TLine> lineQueryService)
        where TParent : class
        where TLine : class
    {
        var services = new ServiceCollection();
        services.AddSingleton(lineQueryService);
        services.AddSingleton(CreateDbContext());
        return services.BuildServiceProvider();
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed class FakeLineQueryService<TParent, TLine> : ILineQueryService<TParent, TLine>
        where TParent : class
        where TLine : class
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>> GetAllResult { get; set; } =
            ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>.Failure(500, "GetAll result not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
            => Task.FromResult(GetAllResult);

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>> GetAllForParentAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken = default)
            => Task.FromResult(GetAllResult);

        public Task<ServiceResult<IEntityResponse<TLine>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<IEntityResponse<TLine>>.Failure(404, "Not configured"));

        public Task<ServiceResult<IEntityResponse<TLine>>> GetByIdAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<IEntityResponse<TLine>>.Failure(404, "Not configured"));
    }

    private sealed class SalesOrderLineListItemTestResponse : IEntityListResponse<SalesOrderLine>
    {
        public Guid Id { get; set; }
        public Guid SalesOrderId { get; set; }
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal LineTotal { get; set; }
        public bool IsActive { get; set; }
    }

    private sealed class PurchaseOrderLineListItemTestResponse : IEntityListResponse<PurchaseOrderLine>
    {
        public Guid Id { get; set; }
        public Guid PurchaseOrderId { get; set; }
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public bool IsActive { get; set; }
    }

    private sealed class SalesInvoiceLineListItemTestResponse : IEntityListResponse<SalesInvoiceLine>
    {
        public Guid Id { get; set; }
        public Guid SalesInvoiceId { get; set; }
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LineTotal { get; set; }
        public bool IsActive { get; set; }
    }

    private sealed class PurchaseInvoiceLineListItemTestResponse : IEntityListResponse<PurchaseInvoiceLine>
    {
        public Guid Id { get; set; }
        public Guid PurchaseInvoiceId { get; set; }
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LineTotal { get; set; }
        public bool IsActive { get; set; }
    }

    private sealed class InvoiceLineListItemTestResponse : IEntityListResponse<InvoiceLine>
    {
        public Guid Id { get; set; }
        public Guid InvoiceId { get; set; }
        public Guid ProductId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LineTotal { get; set; }
        public bool IsActive { get; set; }
    }
}
