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

public class CreateCommandHandlerBaseTests
{
    [Fact]
    public async Task Handle_WhenSuccessful_MapsDetailsAndDelegatesToCommandService()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Product>>.Success(new ProductDetailsResponse
            {
                Id = Guid.NewGuid(),
                Name = "Product A",
                Sku = "A-001",
                UnitOfMeasure = "EA",
                SalesPrice = 100m,
                ReorderLevel = 5m,
                IsActive = true,
            }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestCreateProductHandler(serviceProvider);
        var request = new CreateProductRequest { Name = "Product A", Sku = "A-001", UnitOfMeasure = "EA" };

        var result = await handler.Handle(new TestCreateProductCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal("Product A", result.Value!.Name);
        Assert.Equal(1, fakeCommandService.CreateCalls);
        Assert.Same(request, fakeCommandService.LastCreateRequest);
        Assert.Same(serviceProvider.GetRequiredService<AppDbContext>(), fakeCommandService.LastCreateDbContext);
    }

    [Fact]
    public async Task Handle_WhenValidationFails_PreservesValidationErrors()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Product>>.ValidationFailure(
                new Dictionary<string, string[]> { ["Name"] = ["Name is required."] }),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestCreateProductHandler(serviceProvider);

        var result = await handler.Handle(new TestCreateProductCommand(new CreateProductRequest()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.True(result.Validation!.Errors.ContainsKey("Name"));
        Assert.Equal("Name is required.", result.Validation.Errors["Name"][0]);
    }

    [Fact]
    public async Task Handle_WhenFailure_PreservesStatusCodeAndErrorMessage()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Product>>.Failure(409, "SKU already exists"),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestCreateProductHandler(serviceProvider);

        var result = await handler.Handle(new TestCreateProductCommand(new CreateProductRequest()), CancellationToken.None);

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

    private sealed record TestCreateProductCommand(CreateProductRequest Request) : IRequest<ServiceResult<ProductDetailsResponse>>;

    private sealed class TestCreateProductHandler(IServiceProvider serviceProvider)
        : CreateCommandHandlerBase<TestCreateProductCommand, Product, CreateProductRequest, ProductDetailsResponse>(serviceProvider)
    {
        protected override CreateProductRequest GetCreateRequest(TestCreateProductCommand request) => request.Request;
    }

    private sealed class FakeProductCommandService : ICommandService<Product>
    {
        public ServiceResult<IEntityResponse<Product>> CreateResult { get; set; } =
            ServiceResult<IEntityResponse<Product>>.Failure(500, "Create result not configured");

        public int CreateCalls { get; private set; }

        public ICreateInput<Product>? LastCreateRequest { get; private set; }

        public AppDbContext? LastCreateDbContext { get; private set; }

        public Task<ServiceResult<IEntityResponse<Product>>> CreateAsync(
            ICreateInput<Product> request,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            CreateCalls++;
            LastCreateRequest = request;
            LastCreateDbContext = dbContext;
            return Task.FromResult(CreateResult);
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
            throw new NotImplementedException();
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