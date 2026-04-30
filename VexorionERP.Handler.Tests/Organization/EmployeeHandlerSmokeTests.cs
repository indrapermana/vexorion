using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class EmployeeHandlerSmokeTests
{
    [Fact]
    public async Task CreateEmployeeCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeEmployeeCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Employee>>.Success(new EmployeeDetailsResponse { Id = id, FirstName = "Jane", LastName = "Doe", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateEmployeeCommandHandler(sp);
        var result = await handler.Handle(new CreateEmployeeCommand(new CreateEmployeeRequest { FirstName = "Jane", LastName = "Doe", EmployeeNumber = "E001" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateEmployeeCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeEmployeeCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Employee>>.Failure(400, "Validation failed")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateEmployeeCommandHandler(sp);
        var result = await handler.Handle(new CreateEmployeeCommand(new CreateEmployeeRequest { FirstName = "Jane", LastName = "Doe", EmployeeNumber = "E001" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task UpdateEmployeeCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeEmployeeCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Employee>>.Success(new EmployeeDetailsResponse { Id = id, FirstName = "Jane", LastName = "Smith", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateEmployeeCommandHandler(sp);
        var result = await handler.Handle(new UpdateEmployeeCommand(id, new UpdateEmployeeRequest { FirstName = "Jane", LastName = "Smith" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Smith", result.Value!.LastName);
    }

    [Fact]
    public async Task DeleteEmployeeCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var fake = new FakeEmployeeCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteEmployeeCommandHandler(sp);
        var result = await handler.Handle(new DeleteEmployeeCommand(Guid.NewGuid()), default);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task DeleteEmployeeCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeEmployeeCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteEmployeeCommandHandler(sp);
        var result = await handler.Handle(new DeleteEmployeeCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetEmployeesQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeEmployeeQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Employee>>>.Success([new EmployeeListItemResponse { Id = Guid.NewGuid(), FirstName = "Jane", LastName = "Doe", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetEmployeesQueryHandler(sp);
        var result = await handler.Handle(new GetEmployeesQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetEmployeeByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeEmployeeQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Employee>>.Success(new EmployeeDetailsResponse { Id = id, FirstName = "Jane", LastName = "Doe", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetEmployeeByIdQueryHandler(sp);
        var result = await handler.Handle(new GetEmployeeByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetEmployeeByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeEmployeeQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Employee>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetEmployeeByIdQueryHandler(sp);
        var result = await handler.Handle(new GetEmployeeByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeEmployeeCommandService? commandService = null, FakeEmployeeQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Employee>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Employee>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeEmployeeCommandService : ICommandService<Employee>
    {
        public ServiceResult<IEntityResponse<Employee>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Employee>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Employee>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Employee>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Employee>>> CreateAsync(ICreateInput<Employee> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Employee> GetAddToDbObjectAsync(ICreateInput<Employee> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Employee>>> UpdateAsync(Guid id, IUpdateInput<Employee> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeEmployeeQueryService : IQueryService<Employee>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Employee>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Employee>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Employee>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Employee>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Employee>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Employee>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
