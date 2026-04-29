using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Products;

/// <summary>
/// Smoke tests that exercise the real concrete Product handler classes end-to-end,
/// verifying the generic base closes correctly for each CRUD operation.
/// </summary>
public class ProductHandlerSmokeTests
{
    // -----------------------------------------------------------------------
    // Create
    // -----------------------------------------------------------------------

    [Fact]
    public async Task CreateProductCommandHandler_WhenSuccessful_ReturnsProductDetails()
    {
        var productId = Guid.NewGuid();
        var fakeCommandService = new FakeProductCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Product>>.Success(new ProductDetailsResponse
            {
                Id = productId,
                Name = "Widget",
                Sku = "W-001",
                UnitOfMeasure = "EA",
                SalesPrice = 9.99m,
                ReorderLevel = 10m,
                IsActive = true,
            }),
        };

        using var serviceProvider = BuildServiceProvider(commandService: fakeCommandService);
        var handler = new CreateProductCommandHandler(serviceProvider);
        var request = new CreateProductRequest { Name = "Widget", Sku = "W-001", UnitOfMeasure = "EA" };

        var result = await handler.Handle(new CreateProductCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(productId, result.Value!.Id);
        Assert.Equal("Widget", result.Value.Name);
    }

    [Fact]
    public async Task CreateProductCommandHandler_WhenFailure_PropagatesError()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Product>>.Failure(409, "SKU already exists"),
        };

        using var serviceProvider = BuildServiceProvider(commandService: fakeCommandService);
        var handler = new CreateProductCommandHandler(serviceProvider);

        var result = await handler.Handle(
            new CreateProductCommand(new CreateProductRequest { Sku = "W-001" }),
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("SKU already exists", result.ErrorMessage);
    }

    // -----------------------------------------------------------------------
    // GetAll
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetProductsQueryHandler_WhenSuccessful_ReturnsMappedList()
    {
        var fakeQueryService = new FakeProductQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>.Success(
            [
                new ProductListItemTestResponse
                {
                    Id = Guid.NewGuid(),
                    Name = "Widget",
                    Sku = "W-001",
                    UnitOfMeasure = "EA",
                    SalesPrice = 9.99m,
                    ReorderLevel = 10m,
                    IsActive = true,
                },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(queryService: fakeQueryService);
        var handler = new GetProductsQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetProductsQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Single(result.Value!);
    }

    // -----------------------------------------------------------------------
    // GetById
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetProductByIdQueryHandler_WhenSuccessful_ReturnsMappedDetails()
    {
        var productId = Guid.NewGuid();
        var fakeQueryService = new FakeProductQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Product>>.Success(new ProductDetailsResponse
            {
                Id = productId,
                Name = "Widget",
                Sku = "W-001",
                UnitOfMeasure = "EA",
                SalesPrice = 9.99m,
                ReorderLevel = 10m,
                IsActive = true,
            }),
        };

        using var serviceProvider = BuildServiceProvider(queryService: fakeQueryService);
        var handler = new GetProductByIdQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetProductByIdQuery(productId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(productId, result.Value!.Id);
    }

    [Fact]
    public async Task GetProductByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fakeQueryService = new FakeProductQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Product>>.Failure(404, "Product not found"),
        };

        using var serviceProvider = BuildServiceProvider(queryService: fakeQueryService);
        var handler = new GetProductByIdQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetProductByIdQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Product not found", result.ErrorMessage);
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    [Fact]
    public async Task UpdateProductCommandHandler_WhenSuccessful_ReturnsMappedDetails()
    {
        var productId = Guid.NewGuid();
        var fakeCommandService = new FakeProductCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Product>>.Success(new ProductDetailsResponse
            {
                Id = productId,
                Name = "Widget v2",
                Sku = "W-001",
                UnitOfMeasure = "EA",
                SalesPrice = 12.99m,
                ReorderLevel = 10m,
                IsActive = true,
            }),
        };

        using var serviceProvider = BuildServiceProvider(commandService: fakeCommandService);
        var handler = new UpdateProductCommandHandler(serviceProvider);
        var updateRequest = new UpdateProductRequest { Name = "Widget v2", SalesPrice = 12.99m };

        var result = await handler.Handle(new UpdateProductCommand(productId, updateRequest), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal("Widget v2", result.Value!.Name);
        Assert.Equal(productId, result.Value.Id);
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    [Fact]
    public async Task DeleteProductCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var productId = Guid.NewGuid();
        var fakeCommandService = new FakeProductCommandService
        {
            DeleteResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(commandService: fakeCommandService);
        var handler = new DeleteProductCommandHandler(serviceProvider);

        var result = await handler.Handle(new DeleteProductCommand(productId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.Equal(productId, fakeCommandService.LastDeleteId);
    }

    [Fact]
    public async Task DeleteProductCommandHandler_WhenNotFound_PropagatesError()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            DeleteResult = ServiceResult<bool>.Failure(404, "Product not found"),
        };

        using var serviceProvider = BuildServiceProvider(commandService: fakeCommandService);
        var handler = new DeleteProductCommandHandler(serviceProvider);

        var result = await handler.Handle(new DeleteProductCommand(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Product not found", result.ErrorMessage);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static ServiceProvider BuildServiceProvider(
        FakeProductCommandService? commandService = null,
        FakeProductQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null)
            services.AddSingleton<ICommandService<Product>>(commandService);
        if (queryService is not null)
            services.AddSingleton<IQueryService<Product>>(queryService);
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

    // Concrete stand-in for IEntityListResponse<Product> to avoid Mapster cast issues.
    private sealed class ProductListItemTestResponse : IEntityListResponse<Product>
    {
        public Guid Id { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string UnitOfMeasure { get; set; } = string.Empty;
        public decimal SalesPrice { get; set; }
        public decimal ReorderLevel { get; set; }
        public bool IsActive { get; set; }
    }

    // -----------------------------------------------------------------------
    // Fake services
    // -----------------------------------------------------------------------

    private sealed class FakeProductCommandService : ICommandService<Product>
    {
        public ServiceResult<IEntityResponse<Product>> CreateResult { get; set; } =
            ServiceResult<IEntityResponse<Product>>.Failure(500, "Create result not configured");

        public ServiceResult<IEntityResponse<Product>> UpdateResult { get; set; } =
            ServiceResult<IEntityResponse<Product>>.Failure(500, "Update result not configured");

        public ServiceResult<bool> DeleteResult { get; set; } =
            ServiceResult<bool>.Failure(500, "Delete result not configured");

        public Guid LastDeleteId { get; private set; }

        public Task<ServiceResult<IEntityResponse<Product>>> CreateAsync(
            ICreateInput<Product> request,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(CreateResult);

        public Task<Product> GetAddToDbObjectAsync(
            ICreateInput<Product> input,
            AppDbContext context,
            CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<ServiceResult<IEntityResponse<Product>>> UpdateAsync(
            Guid productId,
            IUpdateInput<Product> request,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(UpdateResult);

        public Task<ServiceResult<bool>> DeleteAsync(
            Guid productId,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            LastDeleteId = productId;
            return Task.FromResult(DeleteResult);
        }
    }

    private sealed class FakeProductQueryService : IQueryService<Product>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>> GetAllResult { get; set; } =
            ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>.Failure(500, "GetAll result not configured");

        public ServiceResult<IEntityResponse<Product>> GetByIdResult { get; set; } =
            ServiceResult<IEntityResponse<Product>>.Failure(500, "GetById result not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>>> GetAllAsync(
            AppDbContext context,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(GetAllResult);

        public Task<ServiceResult<IEntityResponse<Product>>> GetByIdAsync(
            Guid id,
            AppDbContext context,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(GetByIdResult);
    }
}
