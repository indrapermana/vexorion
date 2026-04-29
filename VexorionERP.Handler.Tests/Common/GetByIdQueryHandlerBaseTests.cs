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

public class GetByIdQueryHandlerBaseTests
{
    [Fact]
    public async Task Handle_WhenSuccessful_MapsDetailsAndDelegatesToQueryService()
    {
        var entityId = Guid.NewGuid();
        var fakeQueryService = new FakeProductQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Product>>.Success(new ProductDetailsResponse
            {
                Id = entityId,
                Name = "Product A",
                Sku = "A-001",
                UnitOfMeasure = "EA",
                SalesPrice = 100m,
                ReorderLevel = 5m,
                IsActive = true,
            }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<IQueryService<Product>>(fakeQueryService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestGetProductByIdHandler(serviceProvider);

        var result = await handler.Handle(new TestGetProductByIdQuery(entityId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(entityId, result.Value!.Id);
        Assert.Equal(1, fakeQueryService.GetByIdCalls);
        Assert.Equal(entityId, fakeQueryService.LastGetByIdId);
        Assert.Same(serviceProvider.GetRequiredService<AppDbContext>(), fakeQueryService.LastGetByIdDbContext);
    }

    [Fact]
    public async Task Handle_WhenValidationFails_PreservesValidationErrors()
    {
        var fakeQueryService = new FakeProductQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Product>>.ValidationFailure(
                new Dictionary<string, string[]> { ["Id"] = ["Invalid product id."] }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<IQueryService<Product>>(fakeQueryService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestGetProductByIdHandler(serviceProvider);

        var result = await handler.Handle(new TestGetProductByIdQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.Equal("Invalid product id.", result.Validation!.Errors["Id"][0]);
    }

    [Fact]
    public async Task Handle_WhenFailure_PreservesStatusCodeAndErrorMessage()
    {
        var fakeQueryService = new FakeProductQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Product>>.Failure(404, "Entity not found."),
        };

        var services = new ServiceCollection();
        services.AddSingleton<IQueryService<Product>>(fakeQueryService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestGetProductByIdHandler(serviceProvider);

        var result = await handler.Handle(new TestGetProductByIdQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Entity not found.", result.ErrorMessage);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed record TestGetProductByIdQuery(Guid ProductId) : IRequest<ServiceResult<ProductDetailsResponse>>;

    private sealed class TestGetProductByIdHandler(IServiceProvider serviceProvider)
        : GetByIdQueryHandlerBase<TestGetProductByIdQuery, Product, ProductDetailsResponse>(serviceProvider)
    {
        protected override Guid GetEntityId(TestGetProductByIdQuery request) => request.ProductId;
    }

    private sealed class FakeProductQueryService : IQueryService<Product>
    {
        public ServiceResult<IEntityResponse<Product>> GetByIdResult { get; set; } =
            ServiceResult<IEntityResponse<Product>>.Failure(500, "GetById result not configured");

        public int GetByIdCalls { get; private set; }

        public Guid? LastGetByIdId { get; private set; }

        public AppDbContext? LastGetByIdDbContext { get; private set; }

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>> GetAllAsync(
            AppDbContext context,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }

        public Task<ServiceResult<IEntityResponse<Product>>> GetByIdAsync(
            Guid customerId,
            AppDbContext context,
            CancellationToken cancellationToken = default)
        {
            GetByIdCalls++;
            LastGetByIdId = customerId;
            LastGetByIdDbContext = context;
            return Task.FromResult(GetByIdResult);
        }
    }
}
