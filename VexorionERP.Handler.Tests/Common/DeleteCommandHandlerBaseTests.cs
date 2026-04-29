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

public class DeleteCommandHandlerBaseTests
{
    [Fact]
    public async Task Handle_DelegatesToCommandServiceAndReturnsServiceResult()
    {
        var entityId = Guid.NewGuid();
        var fakeCommandService = new FakeProductCommandService
        {
            DeleteResult = ServiceResult<bool>.Success(true),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestDeleteProductHandler(serviceProvider);

        var result = await handler.Handle(new TestDeleteProductCommand(entityId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.Equal(1, fakeCommandService.DeleteCalls);
        Assert.Equal(entityId, fakeCommandService.LastDeleteId);
        Assert.Same(serviceProvider.GetRequiredService<AppDbContext>(), fakeCommandService.LastDeleteDbContext);
    }

    [Fact]
    public async Task Handle_WhenFailure_PreservesStatusCodeAndErrorMessage()
    {
        var fakeCommandService = new FakeProductCommandService
        {
            DeleteResult = ServiceResult<bool>.Failure(404, "Entity not found."),
        };

        var services = new ServiceCollection();
        services.AddSingleton<ICommandService<Product>>(fakeCommandService);
        services.AddSingleton(CreateDbContext());
        using var serviceProvider = services.BuildServiceProvider();

        var handler = new TestDeleteProductHandler(serviceProvider);

        var result = await handler.Handle(new TestDeleteProductCommand(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Entity not found.", result.ErrorMessage);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed record TestDeleteProductCommand(Guid ProductId) : IRequest<ServiceResult<bool>>;

    private sealed class TestDeleteProductHandler(IServiceProvider serviceProvider)
        : DeleteCommandHandlerBase<TestDeleteProductCommand, Product>(serviceProvider)
    {
        protected override Guid GetEntityId(TestDeleteProductCommand request) => request.ProductId;
    }

    private sealed class FakeProductCommandService : ICommandService<Product>
    {
        public ServiceResult<bool> DeleteResult { get; set; } = ServiceResult<bool>.Failure(500, "Delete result not configured");

        public int DeleteCalls { get; private set; }

        public Guid? LastDeleteId { get; private set; }

        public AppDbContext? LastDeleteDbContext { get; private set; }

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
            throw new NotImplementedException();
        }

        public Task<ServiceResult<bool>> DeleteAsync(
            Guid productId,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            DeleteCalls++;
            LastDeleteId = productId;
            LastDeleteDbContext = dbContext;
            return Task.FromResult(DeleteResult);
        }
    }
}
