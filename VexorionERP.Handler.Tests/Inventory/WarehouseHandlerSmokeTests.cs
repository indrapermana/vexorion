using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class WarehouseHandlerSmokeTests
{
    [Fact]
    public async Task CreateWarehouseCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeWarehouseCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Warehouse>>.Success(new WarehouseDetailsResponse { Id = id, Code = "WH01", Name = "Main", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateWarehouseCommandHandler(sp);
        var result = await handler.Handle(new CreateWarehouseCommand(new CreateWarehouseRequest { Code = "WH01", Name = "Main" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateWarehouseCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeWarehouseCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Warehouse>>.Failure(409, "Duplicate code")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateWarehouseCommandHandler(sp);
        var result = await handler.Handle(new CreateWarehouseCommand(new CreateWarehouseRequest { Code = "WH01", Name = "Main" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task UpdateWarehouseCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeWarehouseCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Warehouse>>.Success(new WarehouseDetailsResponse { Id = id, Code = "WH01", Name = "Main Updated", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateWarehouseCommandHandler(sp);
        var result = await handler.Handle(new UpdateWarehouseCommand(id, new UpdateWarehouseRequest { Code = "WH01", Name = "Main Updated" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Main Updated", result.Value!.Name);
    }

    [Fact]
    public async Task DeleteWarehouseCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var fake = new FakeWarehouseCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteWarehouseCommandHandler(sp);
        var result = await handler.Handle(new DeleteWarehouseCommand(Guid.NewGuid()), default);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task DeleteWarehouseCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeWarehouseCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteWarehouseCommandHandler(sp);
        var result = await handler.Handle(new DeleteWarehouseCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetWarehousesQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeWarehouseQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>>.Success([new WarehouseListItemResponse { Id = Guid.NewGuid(), Code = "WH01", Name = "Main", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetWarehousesQueryHandler(sp);
        var result = await handler.Handle(new GetWarehousesQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetWarehouseByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeWarehouseQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Warehouse>>.Success(new WarehouseDetailsResponse { Id = id, Code = "WH01", Name = "Main", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetWarehouseByIdQueryHandler(sp);
        var result = await handler.Handle(new GetWarehouseByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetWarehouseByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeWarehouseQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Warehouse>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetWarehouseByIdQueryHandler(sp);
        var result = await handler.Handle(new GetWarehouseByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeWarehouseCommandService? commandService = null, FakeWarehouseQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Warehouse>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Warehouse>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeWarehouseCommandService : ICommandService<Warehouse>
    {
        public ServiceResult<IEntityResponse<Warehouse>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Warehouse>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Warehouse>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Warehouse>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Warehouse>>> CreateAsync(ICreateInput<Warehouse> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Warehouse> GetAddToDbObjectAsync(ICreateInput<Warehouse> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Warehouse>>> UpdateAsync(Guid id, IUpdateInput<Warehouse> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeWarehouseQueryService : IQueryService<Warehouse>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Warehouse>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Warehouse>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Warehouse>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
