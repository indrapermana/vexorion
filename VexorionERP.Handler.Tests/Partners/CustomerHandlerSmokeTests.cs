using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class CustomerHandlerSmokeTests
{
    [Fact]
    public async Task CreateCustomerCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCustomerCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Customer>>.Success(new CustomerDetailsResponse { Id = id, CustomerNumber = "C001", Name = "Alice", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateCustomerCommandHandler(sp);
        var result = await handler.Handle(new CreateCustomerCommand(new CreateCustomerRequest { CustomerNumber = "C001", Name = "Alice" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateCustomerCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeCustomerCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Customer>>.Failure(409, "Duplicate number")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateCustomerCommandHandler(sp);
        var result = await handler.Handle(new CreateCustomerCommand(new CreateCustomerRequest { CustomerNumber = "C001", Name = "Alice" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task UpdateCustomerCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCustomerCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Customer>>.Success(new CustomerDetailsResponse { Id = id, CustomerNumber = "C001", Name = "Alice Updated", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateCustomerCommandHandler(sp);
        var result = await handler.Handle(new UpdateCustomerCommand(id, new UpdateCustomerRequest { CustomerNumber = "C001", Name = "Alice Updated" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Alice Updated", result.Value!.Name);
    }

    [Fact]
    public async Task DeleteCustomerCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCustomerCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteCustomerCommandHandler(sp);
        var result = await handler.Handle(new DeleteCustomerCommand(id), default);
        Assert.True(result.Succeeded);
        Assert.True(result.Value);
    }

    [Fact]
    public async Task DeleteCustomerCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeCustomerCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteCustomerCommandHandler(sp);
        var result = await handler.Handle(new DeleteCustomerCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetCustomersQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeCustomerQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>>.Success([new CustomerListItemResponse { Id = Guid.NewGuid(), CustomerNumber = "C001", Name = "Alice", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetCustomersQueryHandler(sp);
        var result = await handler.Handle(new GetCustomersQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetCustomerByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCustomerQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Customer>>.Success(new CustomerDetailsResponse { Id = id, CustomerNumber = "C001", Name = "Alice", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetCustomerByIdQueryHandler(sp);
        var result = await handler.Handle(new GetCustomerByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetCustomerByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeCustomerQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Customer>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetCustomerByIdQueryHandler(sp);
        var result = await handler.Handle(new GetCustomerByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeCustomerCommandService? commandService = null, FakeCustomerQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Customer>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Customer>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeCustomerCommandService : ICommandService<Customer>
    {
        public ServiceResult<IEntityResponse<Customer>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Customer>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Customer>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Customer>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Customer>>> CreateAsync(ICreateInput<Customer> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Customer> GetAddToDbObjectAsync(ICreateInput<Customer> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Customer>>> UpdateAsync(Guid id, IUpdateInput<Customer> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeCustomerQueryService : IQueryService<Customer>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Customer>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Customer>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Customer>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
