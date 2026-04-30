using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class CompanyHandlerSmokeTests
{
    [Fact]
    public async Task CreateCompanyCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCompanyCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Company>>.Success(new CompanyDetailsResponse { Id = id, Name = "Corp", Code = "CORP", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateCompanyCommandHandler(sp);
        var result = await handler.Handle(new CreateCompanyCommand(new CreateCompanyRequest { Name = "Corp", Code = "CORP" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task CreateCompanyCommandHandler_WhenFailure_PropagatesError()
    {
        var fake = new FakeCompanyCommandService
        {
            CreateResult = ServiceResult<IEntityResponse<Company>>.Failure(409, "Duplicate code")
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new CreateCompanyCommandHandler(sp);
        var result = await handler.Handle(new CreateCompanyCommand(new CreateCompanyRequest { Name = "Corp", Code = "CORP" }), default);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task UpdateCompanyCommandHandler_WhenSuccessful_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCompanyCommandService
        {
            UpdateResult = ServiceResult<IEntityResponse<Company>>.Success(new CompanyDetailsResponse { Id = id, Name = "Corp Updated", Code = "CORP", IsActive = true })
        };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new UpdateCompanyCommandHandler(sp);
        var result = await handler.Handle(new UpdateCompanyCommand(id, new UpdateCompanyRequest { Name = "Corp Updated", Code = "CORP" }), default);
        Assert.True(result.Succeeded);
        Assert.Equal("Corp Updated", result.Value!.Name);
    }

    [Fact]
    public async Task DeleteCompanyCommandHandler_WhenSuccessful_ReturnsTrue()
    {
        var fake = new FakeCompanyCommandService { DeleteResult = ServiceResult<bool>.Success(true) };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteCompanyCommandHandler(sp);
        var result = await handler.Handle(new DeleteCompanyCommand(Guid.NewGuid()), default);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task DeleteCompanyCommandHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeCompanyCommandService { DeleteResult = ServiceResult<bool>.Failure(404, "Not found") };
        using var sp = BuildServiceProvider(commandService: fake);
        var handler = new DeleteCompanyCommandHandler(sp);
        var result = await handler.Handle(new DeleteCompanyCommand(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetCompaniesQueryHandler_WhenSuccessful_ReturnsList()
    {
        var fake = new FakeCompanyQueryService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<IEntityListResponse<Company>>>.Success([new CompanyListItemResponse { Id = Guid.NewGuid(), Name = "Corp", Code = "CORP", IsActive = true }])
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetCompaniesQueryHandler(sp);
        var result = await handler.Handle(new GetCompaniesQuery(), default);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetCompanyByIdQueryHandler_WhenFound_ReturnsDetails()
    {
        var id = Guid.NewGuid();
        var fake = new FakeCompanyQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Company>>.Success(new CompanyDetailsResponse { Id = id, Name = "Corp", Code = "CORP", IsActive = true })
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetCompanyByIdQueryHandler(sp);
        var result = await handler.Handle(new GetCompanyByIdQuery(id), default);
        Assert.True(result.Succeeded);
        Assert.Equal(id, result.Value!.Id);
    }

    [Fact]
    public async Task GetCompanyByIdQueryHandler_WhenNotFound_PropagatesError()
    {
        var fake = new FakeCompanyQueryService
        {
            GetByIdResult = ServiceResult<IEntityResponse<Company>>.Failure(404, "Not found")
        };
        using var sp = BuildServiceProvider(queryService: fake);
        var handler = new GetCompanyByIdQueryHandler(sp);
        var result = await handler.Handle(new GetCompanyByIdQuery(Guid.NewGuid()), default);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    private static ServiceProvider BuildServiceProvider(FakeCompanyCommandService? commandService = null, FakeCompanyQueryService? queryService = null)
    {
        var services = new ServiceCollection();
        if (commandService is not null) services.AddSingleton<ICommandService<Company>>(commandService);
        if (queryService is not null) services.AddSingleton<IQueryService<Company>>(queryService);
        services.AddSingleton(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options));
        return services.BuildServiceProvider();
    }

    private sealed class FakeCompanyCommandService : ICommandService<Company>
    {
        public ServiceResult<IEntityResponse<Company>> CreateResult { get; set; } = ServiceResult<IEntityResponse<Company>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Company>> UpdateResult { get; set; } = ServiceResult<IEntityResponse<Company>>.Failure(500, "Not configured");
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Not configured");

        public Task<ServiceResult<IEntityResponse<Company>>> CreateAsync(ICreateInput<Company> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(CreateResult);
        public Task<Company> GetAddToDbObjectAsync(ICreateInput<Company> input, AppDbContext context, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ServiceResult<IEntityResponse<Company>>> UpdateAsync(Guid id, IUpdateInput<Company> request, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(UpdateResult);
        public Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default) => Task.FromResult(DeleteResult);
    }

    private sealed class FakeCompanyQueryService : IQueryService<Company>
    {
        public ServiceResult<IReadOnlyCollection<IEntityListResponse<Company>>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<IEntityListResponse<Company>>>.Failure(500, "Not configured");
        public ServiceResult<IEntityResponse<Company>> GetByIdResult { get; set; } = ServiceResult<IEntityResponse<Company>>.Failure(500, "Not configured");

        public Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Company>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetAllResult);
        public Task<ServiceResult<IEntityResponse<Company>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default) => Task.FromResult(GetByIdResult);
    }
}
