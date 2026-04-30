using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class AccountHandlerSmokeTests
{
    [Fact]
    public async Task CreateAccountCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeAccountCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Account>>.Success(new AccountDetailsResponse { Id = id, Code = "1000", Name = "Cash", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateAccountCommandHandler(sp);
        var result = await handler.Handle(new CreateAccountCommand(new CreateAccountRequest { Code = "1000", Name = "Cash" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateAccountCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeAccountCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Account>>.Failure(409, "Duplicate code")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateAccountCommandHandler(sp);
        var result = await handler.Handle(new CreateAccountCommand(new CreateAccountRequest { Code = "1000", Name = "Cash" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task UpdateAccountCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeAccountCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Account>>.Success(new AccountDetailsResponse { Id = id, Code = "1000", Name = "Cash Updated", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateAccountCommandHandler(sp);
        var result = await handler.Handle(new UpdateAccountCommand(id, new UpdateAccountRequest { Code = "1000", Name = "Cash Updated" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Cash Updated", result.Value!.Name);
    }

    [Fact]
    public async Task DeleteAccountCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var fake = new FakeAccountCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteAccountCommandHandler(sp);
        var result = await handler.Handle(new DeleteAccountCommand(Guid.NewGuid()), default);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task DeleteAccountCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeAccountCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteAccountCommandHandler(sp);
        var result = await handler.Handle(new DeleteAccountCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetAccountsQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeAccountQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>>.Success([new AccountListItemResponse { Id = Guid.NewGuid(), Code = "1000", Name = "Cash", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetAccountsQueryHandler(sp);
        var result = await handler.Handle(new GetAccountsQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetAccountByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeAccountQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Account>>.Success(new AccountDetailsResponse { Id = id, Code = "1000", Name = "Cash", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetAccountByIdQueryHandler(sp);
        var result = await handler.Handle(new GetAccountByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetAccountByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeAccountQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Account>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetAccountByIdQueryHandler(sp);
        var result = await handler.Handle(new GetAccountByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeAccountCommandService? commandService = null, FakeAccountQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Account>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Account>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeAccountCommandService : ICommandService<Account>
    {
        public ServiceResult<IEntityResponse<Account>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Account>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Account>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Account>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Account>>> CreateAsync(ICreateInput<Account> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Account> GetAddToDbObjectAsync(ICreateInput<Account> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Account>>> UpdateAsync(Guid id, IUpdateInput<Account> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeAccountQueryService : IQueryService<Account>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Account>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Account>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Account>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
