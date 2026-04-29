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

public class UpdateCommandHandlerBaseTests
{
    [Fact]
    public async Task Handle_WhenSuccessful_MapsDetailsAndDelegatesToCommandService()
    {
        var entityId = Guid.NewGuid();
        var request = new UpdateProductRequest { Name = "Updated Product", Sku = "A-001", UnitOfMeasure = "EA", IsActive = true };
        var fakeCommandService = new FakeProductCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Product>>.Success(new ProductDetailsResponse
            {
                Id = entityId,
                Name = "Updated Product",
                Sku = "A-001",
                UnitOfMeasure = "EA",
                SalesPrice = 120m,
                ReorderLevel = 5m,
                IsActive = true,
            }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestUpdateProductHandler(serviceProvider);

        var result = await handler.Handle(new TestUpdateProductCommand(entityId, request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(entityId, result.Value!.Id);
        Assert.Equal(1, fakeCommandService.UpdateCalls);
        Assert.Equal(entityId, fakeCommandService.LastUpdateId);
        Assert.Same(request, fakeCommandService.LastUpdateRequest);
        Assert.Same(serviceProvider.GetRequiredService<AppDbContext>(), fakeCommandService.LastUpdateDbContext);
    }

    [Fact]
    public async Task Handle_WhenValidationFails_PreservesValidationErrors()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Product>>.ValidationFailure(
                new Dictionary<string, string[]> { ["Name"] = ["Name is required."] }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestUpdateProductHandler(serviceProvider);

        var result = await handler.Handle(new TestUpdateProductCommand(Guid.NewGuid(), new UpdateProductRequest()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.Equal("Name is required.", result.Validation!.Errors["Name"][0]);
    }

    [Fact]
    public async Task Handle_WhenFailure_PreservesStatusCodeAndErrorMessage()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Product>>.Failure(409, "SKU already exists"),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestUpdateProductHandler(serviceProvider);

        var result = await handler.Handle(new TestUpdateProductCommand(Guid.NewGuid(), new UpdateProductRequest()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("SKU already exists", result.ErrorMessage);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed record TestUpdateProductCommand(Guid ProductId, UpdateProductRequest Request) : IRequest<ServiceResult<ProductDetailsResponse>>;

    private sealed class TestUpdateProductHandler(IServiceProvider serviceProvider)
        : UpdateCommandHandlerBase<TestUpdateProductCommand, Product, UpdateProductRequest, ProductDetailsResponse>(serviceProvider)
    {
        protected override Guid GetEntityId(TestUpdateProductCommand request) => request.ProductId;

        protected override UpdateProductRequest GetUpdateRequest(TestUpdateProductCommand request) => request.Request;
    }

    private sealed class FakeProductCommandService : ICommandService<Product>
    {
        public ServiceResult<IEntityResponse<Product>> UpdateResult { get; set; } =
            ServiceResult<IEntityResponse<Product>>.Failure(500, "Update result not configured");

        public int UpdateCalls { get; private set; }

        public Guid? LastUpdateId { get; private set; }

        public IUpdateInput<Product>? LastUpdateRequest { get; private set; }

        public AppDbContext? LastUpdateDbContext { get; private set; }

        public Task<ServiceResult<IEntityResponse<Product>>> CreateAsync(
            ICreateInput<Product> request,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }

        public Task<Product> GetAddToDbObjectAsync(
            ICreateInput<Product> input,
            AppDbContext context,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }

        public Task<ServiceResult<IEntityResponse<Product>>> UpdateAsync(
            Guid productId,
            IUpdateInput<Product> request,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            UpdateCalls++;
            LastUpdateId = productId;
            LastUpdateRequest = request;
            LastUpdateDbContext = dbContext;
            return Task.FromResult(UpdateResult);
        }

        public Task<ServiceResult<bool>> DeleteAsync(
            Guid productId,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }
    }
}
