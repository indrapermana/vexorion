using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class DepartmentHandlerSmokeTests
{
    [Fact]
    public async Task CreateDepartmentCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeDepartmentCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Department>>.Success(new DepartmentDetailsResponse { Id = id, Name = "Engineering", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateDepartmentCommandHandler(sp);
        var result = await handler.Handle(new CreateDepartmentCommand(new CreateDepartmentRequest { Name = "Engineering" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateDepartmentCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeDepartmentCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Department>>.Failure(400, "Validation failed")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateDepartmentCommandHandler(sp);
        var result = await handler.Handle(new CreateDepartmentCommand(new CreateDepartmentRequest { Name = "Engineering" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task UpdateDepartmentCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeDepartmentCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Department>>.Success(new DepartmentDetailsResponse { Id = id, Name = "Engineering Updated", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateDepartmentCommandHandler(sp);
        var result = await handler.Handle(new UpdateDepartmentCommand(id, new UpdateDepartmentRequest { Name = "Engineering Updated" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Engineering Updated", result.Value!.Name);
    }

    [Fact]
    public async Task DeleteDepartmentCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var fake = new FakeDepartmentCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteDepartmentCommandHandler(sp);
        var result = await handler.Handle(new DeleteDepartmentCommand(Guid.NewGuid()), default);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task DeleteDepartmentCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeDepartmentCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteDepartmentCommandHandler(sp);
        var result = await handler.Handle(new DeleteDepartmentCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetDepartmentsQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeDepartmentQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Department>>>.Success([new DepartmentListItemResponse { Id = Guid.NewGuid(), Name = "Engineering", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetDepartmentsQueryHandler(sp);
        var result = await handler.Handle(new GetDepartmentsQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetDepartmentByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeDepartmentQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Department>>.Success(new DepartmentDetailsResponse { Id = id, Name = "Engineering", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetDepartmentByIdQueryHandler(sp);
        var result = await handler.Handle(new GetDepartmentByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetDepartmentByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeDepartmentQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Department>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetDepartmentByIdQueryHandler(sp);
        var result = await handler.Handle(new GetDepartmentByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeDepartmentCommandService? commandService = null, FakeDepartmentQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Department>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Department>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeDepartmentCommandService : ICommandService<Department>
    {
        public ServiceResult<IEntityResponse<Department>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Department>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Department>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Department>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Department>>> CreateAsync(ICreateInput<Department> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Department> GetAddToDbObjectAsync(ICreateInput<Department> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Department>>> UpdateAsync(Guid id, IUpdateInput<Department> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeDepartmentQueryService : IQueryService<Department>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Department>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Department>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Department>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Department>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Department>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Department>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
