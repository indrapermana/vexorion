using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler.Tests.Configuration.Imports;

internal sealed class FakeTenantProvider(Guid? tenantId) : ICurrentTenantProvider
{
    public Guid? TenantId => tenantId;
}

internal sealed class FakeAuditLogger : IAuditLogger
{
    public Task LogAsync(
        string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId,
        string? entityName, string? entityId, string? description,
        object? metadata = null, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}

internal sealed class FakeImportWorkbookService : IImportWorkbookService
{
    public string TemplateName { get; set; } = "template.xlsx";

    public ImportWorkbookReadResult ReadResult { get; set; } =
        new(
            "Template",
            ["Col1"],
            [new ImportWorkbookRow(2, new Dictionary<string, string> { ["Col1"] = "val" })]);

    public bool ThrowOnRead { get; set; }

    public ImportTemplateResponse BuildTemplate(string importType, IReadOnlyCollection<string> columns)
        => new()
        {
            ImportType = importType,
            FileName = TemplateName,
            ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Content = [1, 2, 3],
        };

    public ImportWorkbookReadResult ReadWorkbook(byte[] content)
    {
        if (ThrowOnRead)
            throw new InvalidOperationException("Simulated corrupt file.");
        return ReadResult;
    }

    public ImportErrorWorkbookResult BuildValidationErrorWorkbook(
        string importType, IReadOnlyCollection<ImportValidationErrorResponse> errors)
        => new("errors.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [1, 2, 3]);
}

internal sealed class FakeImportValidationEngine : IImportValidationEngine
{
    public IReadOnlyCollection<ImportValidationErrorResponse> Errors { get; set; } = [];

    public Task<IReadOnlyCollection<ImportValidationErrorResponse>> ValidateAsync(
        ImportValidationContext context, CancellationToken cancellationToken = default)
        => Task.FromResult(Errors);
}

internal sealed class FakeImportExecutor(string importType) : IImportExecutor
{
    public string ImportType => importType;
    public int ExecuteCalls { get; private set; }

    public Task<ImportExecuteResult> ExecuteAsync(
        Guid tenantId, IReadOnlyCollection<ImportWorkbookRow> rows,
        CancellationToken cancellationToken = default)
    {
        ExecuteCalls++;
        return Task.FromResult(new ImportExecuteResult(rows.Count, 0, 0, []));
    }
}

internal sealed class FakeImportJobService : IImportJobService
{
    public ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>> AvailableTypesResult { get; set; }
        = ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>.Failure(500, "Not configured");

    public ServiceResult<ImportTemplateResponse> TemplateResult { get; set; }
        = ServiceResult<ImportTemplateResponse>.Failure(500, "Not configured");

    public ServiceResult<ImportValidationResultResponse> ValidateResult { get; set; }
        = ServiceResult<ImportValidationResultResponse>.Failure(500, "Not configured");

    public ServiceResult<ImportValidationResultResponse> ValidateRowsResult { get; set; }
        = ServiceResult<ImportValidationResultResponse>.Failure(500, "Not configured");

    public ServiceResult<ImportJobStatusResponse> SubmitResult { get; set; }
        = ServiceResult<ImportJobStatusResponse>.Failure(500, "Not configured");

    public ServiceResult<ImportJobStatusResponse> StatusResult { get; set; }
        = ServiceResult<ImportJobStatusResponse>.Failure(500, "Not configured");

    public ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>> HistoryResult { get; set; }
        = ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>.Failure(500, "Not configured");

    public Task<ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>> GetAvailableImportTypesAsync(
        CancellationToken cancellationToken = default) => Task.FromResult(AvailableTypesResult);

    public Task<ServiceResult<ImportTemplateResponse>> DownloadTemplateAsync(
        string importType, CancellationToken cancellationToken = default) => Task.FromResult(TemplateResult);

    public Task<ServiceResult<ImportValidationResultResponse>> ValidateAsync(
        ValidateImportFileRequest request, CancellationToken cancellationToken = default) => Task.FromResult(ValidateResult);

    public Task<ServiceResult<ImportValidationResultResponse>> ValidateRowsAsync(
        ValidateImportRowsRequest request, CancellationToken cancellationToken = default) => Task.FromResult(ValidateRowsResult);

    public Task<ServiceResult<ImportJobStatusResponse>> SubmitAsync(
        Guid importJobId, CancellationToken cancellationToken = default) => Task.FromResult(SubmitResult);

    public Task<ServiceResult<ImportJobStatusResponse>> GetStatusAsync(
        Guid importJobId, CancellationToken cancellationToken = default) => Task.FromResult(StatusResult);

    public Task<ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>> GetHistoryAsync(
        string? importType, int page, int pageSize, CancellationToken cancellationToken = default)
        => Task.FromResult(HistoryResult);
}
