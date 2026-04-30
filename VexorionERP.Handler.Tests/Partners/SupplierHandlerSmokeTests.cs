using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class SupplierHandlerSmokeTests
{
    [Fact]
    public async Task CreateSupplierCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeSupplierCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Supplier>>.Success(new SupplierDetailsResponse { Id = id, SupplierNumber = "S001", Name = "Acme", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateSupplierCommandHandler(sp);
        var result = await handler.Handle(new CreateSupplierCommand(new CreateSupplierRequest { SupplierNumber = "S001", Name = "Acme" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateSupplierCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeSupplierCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Supplier>>.Failure(409, "Duplicate")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateSupplierCommandHandler(sp);
        var result = await handler.Handle(new CreateSupplierCommand(new CreateSupplierRequest { SupplierNumber = "S001", Name = "Acme" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task UpdateSupplierCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeSupplierCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Supplier>>.Success(new SupplierDetailsResponse { Id = id, SupplierNumber = "S001", Name = "Acme Corp", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateSupplierCommandHandler(sp);
        var result = await handler.Handle(new UpdateSupplierCommand(id, new UpdateSupplierRequest { SupplierNumber = "S001", Name = "Acme Corp" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Acme Corp", result.Value!.Name);
    }

    [Fact]
    public async Task DeleteSupplierCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var fake = new FakeSupplierCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteSupplierCommandHandler(sp);
        var result = await handler.Handle(new DeleteSupplierCommand(Guid.NewGuid()), default);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task DeleteSupplierCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeSupplierCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteSupplierCommandHandler(sp);
        var result = await handler.Handle(new DeleteSupplierCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetSuppliersQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeSupplierQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>>.Success([new SupplierListItemResponse { Id = Guid.NewGuid(), SupplierNumber = "S001", Name = "Acme", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetSuppliersQueryHandler(sp);
        var result = await handler.Handle(new GetSuppliersQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetSupplierByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeSupplierQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Supplier>>.Success(new SupplierDetailsResponse { Id = id, SupplierNumber = "S001", Name = "Acme", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetSupplierByIdQueryHandler(sp);
        var result = await handler.Handle(new GetSupplierByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetSupplierByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeSupplierQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Supplier>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetSupplierByIdQueryHandler(sp);
        var result = await handler.Handle(new GetSupplierByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeSupplierCommandService? commandService = null, FakeSupplierQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Supplier>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Supplier>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeSupplierCommandService : ICommandService<Supplier>
    {
        public ServiceResult<IEntityResponse<Supplier>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Supplier>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Supplier>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Supplier>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Supplier>>> CreateAsync(ICreateInput<Supplier> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Supplier> GetAddToDbObjectAsync(ICreateInput<Supplier> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Supplier>>> UpdateAsync(Guid id, IUpdateInput<Supplier> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeSupplierQueryService : IQueryService<Supplier>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Supplier>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Supplier>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Supplier>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
