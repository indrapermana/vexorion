using VexorionERP.Models;

namespace VexorionERP.Services;

public record ImportExecuteResult(
    int Inserted,
    int Updated,
    int Skipped,
    IReadOnlyList<string> Errors);

public interface IImportExecutor
{
    string ImportType { get; }
    Task<ImportExecuteResult> ExecuteAsync(Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows, CancellationToken cancellationToken = default);
}

public interface IImportExecutor<TEntity> : IImportExecutor where TEntity : TenantEntityBase
{
}
