using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeleteTenantCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<DeleteTenantCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(DeleteTenantCommand request, CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
        if (tenant is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Tenant not found.");
        }

        var storageCleanupService = serviceProvider.GetRequiredService<ITenantStorageCleanupService>();
        var storageCleanup = await storageCleanupService.DeleteTenantObjectsAsync(request.TenantId, cancellationToken);
        if (!storageCleanup.Succeeded)
        {
            return storageCleanup;
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var tenantScopedEntityTypes = dbContext.Model.GetEntityTypes()
            .Where(entityType =>
                typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType)
                && !entityType.ClrType.IsAbstract)
            .ToDictionary(entityType => entityType.ClrType, entityType => entityType);

        var deletionOrder = GetDeletionOrder(tenantScopedEntityTypes);

        try
        {
            foreach (var entityType in deletionOrder)
            {
                if (entityType.ClrType == typeof(Tenant))
                {
                    continue;
                }

                await DeleteTenantRowsAsync(dbContext, entityType, request.TenantId, cancellationToken);
            }

            dbContext.Tenants.Remove(tenant);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return ServiceResult<bool>.Success(true);
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ServiceResult<bool>.Failure(StatusCodes.Status500InternalServerError, $"Failed to hard-delete tenant data: {exception.Message}");
        }
    }

    private static IReadOnlyCollection<IEntityType> GetDeletionOrder(IReadOnlyDictionary<Type, IEntityType> entityTypes)
    {
        var dependencies = entityTypes.Values
            .SelectMany(entityType => entityType.GetForeignKeys()
                .Where(foreignKey =>
                    entityTypes.ContainsKey(foreignKey.PrincipalEntityType.ClrType)
                    && foreignKey.DeleteBehavior is not DeleteBehavior.Cascade
                    && foreignKey.DeleteBehavior is not DeleteBehavior.SetNull
                    && foreignKey.DeleteBehavior is not DeleteBehavior.ClientCascade)
                .Select(foreignKey => (Principal: foreignKey.PrincipalEntityType.ClrType, Dependent: entityType.ClrType)))
            .Where(edge => edge.Principal != edge.Dependent)
            .Distinct()
            .ToArray();

        var indegree = entityTypes.Keys.ToDictionary(key => key, _ => 0);
        foreach (var edge in dependencies)
        {
            indegree[edge.Dependent] += 1;
        }

        var queue = new Queue<Type>(indegree.Where(pair => pair.Value == 0).Select(pair => pair.Key));
        var topological = new List<Type>(entityTypes.Count);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            topological.Add(current);

            foreach (var edge in dependencies.Where(edge => edge.Principal == current))
            {
                indegree[edge.Dependent] -= 1;
                if (indegree[edge.Dependent] == 0)
                {
                    queue.Enqueue(edge.Dependent);
                }
            }
        }

        if (topological.Count != entityTypes.Count)
        {
            return entityTypes.Values.ToArray();
        }

        topological.Reverse();
        return topological.Select(clrType => entityTypes[clrType]).ToArray();
    }

    private static async Task DeleteTenantRowsAsync(AppDbContext dbContext, IEntityType entityType, Guid tenantId, CancellationToken cancellationToken)
    {
        if (entityType.FindProperty(nameof(ITenantEntity.TenantId)) is null)
        {
            return;
        }

        var tableName = entityType.GetTableName();
        if (string.IsNullOrWhiteSpace(tableName))
        {
            return;
        }

        var schema = entityType.GetSchema();
        var escapedTable = $"\"{tableName.Replace("\"", "\"\"")}\"";
        var tableIdentifier = string.IsNullOrWhiteSpace(schema)
            ? escapedTable
            : $"\"{schema.Replace("\"", "\"\"")}\".{escapedTable}";

        var sql = "DELETE FROM " + tableIdentifier + " WHERE \"TenantId\" = {0}";
        await dbContext.Database.ExecuteSqlRawAsync(sql, [tenantId], cancellationToken);
    }
}
