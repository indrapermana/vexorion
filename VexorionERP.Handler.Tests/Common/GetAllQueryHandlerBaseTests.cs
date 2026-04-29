using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class GetAllQueryHandlerBaseTests
{
    [Fact]
    public async Task Handle_WhenSuccessful_MapsListAndDelegatesToQueryService()
    {
        var fakeQueryService = new FakeProductQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>.Success(
                new List<IEntityListResponse<Product>>
                {
                    new TestProductListResponse
                    {
                        Id = Guid.NewGuid(),
                        Name = "Product A",
                        Sku = "A-001",
                        UnitOfMeasure = "EA",
                        SalesPrice = 100m,
                        ReorderLevel = 10m,
                        IsActive = true,
                    },
                }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<IQueryService<Product>>(fakeQueryService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestGetAllProductsHandler(serviceProvider);

        var result = await handler.Handle(new TestGetAllProductsQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Single(result.Value!);
        Assert.Equal(1, fakeQueryService.GetAllCalls);
        Assert.Same(serviceProvider.GetRequiredService<AppDbContext>(), fakeQueryService.LastGetAllDbContext);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed record TestGetAllProductsQuery() : IRequest<ServiceResult<IReadOnlyCollection<ProductListItemResponse>>>;

    private sealed class TestGetAllProductsHandler(IServiceProvider serviceProvider)
        : GetAllQueryHandlerBase<TestGetAllProductsQuery, Product, ProductListItemResponse>(serviceProvider);

    private sealed class TestProductListResponse : IEntityListResponse<Product>
    {
        public Guid Id { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string UnitOfMeasure { get; set; } = string.Empty;
        public decimal SalesPrice { get; set; }
        public decimal ReorderLevel { get; set; }
        public bool IsActive { get; set; }
    }

    private sealed class FakeProductQueryService : IQueryService<Product>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>> GetAllResult { get; set; } =
            ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>.Failure(500, "GetAll result not configured");

        public int GetAllCalls { get; private set; }

        public AppDbContext? LastGetAllDbContext { get; private set; }

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>> GetAllAsync(
            AppDbContext context,
            CancellationToken cancellationToken = default)
        {
            GetAllCalls++;
            LastGetAllDbContext = context;
            return Task.FromResult(GetAllResult);
        }

        public Task<ServiceResult<IEntityResponse<Product>>> GetByIdAsync(
            Guid customerId,
            AppDbContext context,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }
    }
}
