using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class ImportJobService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IImportWorkbookService importWorkbookService,
    IImportValidationEngine importValidationEngine,
    IEnumerable<IImportExecutor> importExecutors,
    IAuditLogger auditLogger) : IImportJobService
{
    private readonly IReadOnlyDictionary<string, IImportExecutor> _executors =
        importExecutors.ToDictionary(e => e.ImportType, StringComparer.OrdinalIgnoreCase);

    private static readonly Dictionary<string, string[]> SupportedTemplates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["customer"] = ["CustomerNumber", "Name", "Email", "PhoneNumber", "BillingAddress"],
        ["supplier"] = ["SupplierNumber", "Name", "Email", "PhoneNumber", "Address"],
        ["product"] = ["Sku", "Name", "CategoryName", "Unit", "ListPrice"],
        ["sales-order"] = ["OrderNumber", "OrderDate", "CustomerNumber", "WarehouseCode", "CurrencyCode"],
        ["purchase-order"] = ["OrderNumber", "OrderDate", "SupplierNumber", "WarehouseCode", "CurrencyCode"],
    };

    public Task<ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>> GetAvailableImportTypesAsync(CancellationToken cancellationToken = default)
    {
        var types = SupportedTemplates
            .OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .Select(x => new AvailableImportTypeResponse
            {
                ImportType = x.Key,
                Columns = x.Value,
            })
            .ToArray();

        return Task.FromResult(ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>.Success(types));
    }

    public Task<ServiceResult<ImportTemplateResponse>> DownloadTemplateAsync(string importType, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(importType))
        {
            return Task.FromResult(ServiceResult<ImportTemplateResponse>.Failure(StatusCodes.Status400BadRequest, "Import type is required."));
        }

        if (!SupportedTemplates.TryGetValue(importType.Trim(), out var columns))
        {
            return Task.FromResult(ServiceResult<ImportTemplateResponse>.Failure(StatusCodes.Status404NotFound, $"Unsupported import type '{importType}'."));
        }

        var response = importWorkbookService.BuildTemplate(importType.Trim(), columns);
        return Task.FromResult(ServiceResult<ImportTemplateResponse>.Success(response));
    }

    public async Task<ServiceResult<ImportValidationResultResponse>> ValidateAsync(ValidateImportFileRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ImportType) || string.IsNullOrWhiteSpace(request.FileName))
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Import type and file name are required.");
        }

        if (!SupportedTemplates.ContainsKey(request.ImportType.Trim()))
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status404NotFound, $"Unsupported import type '{request.ImportType}'.");
        }

        if (request.FileContent is null || request.FileContent.Length == 0)
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "File content is required.");
        }

        var fileExtension = Path.GetExtension(request.FileName)?.ToLowerInvariant();
        if (fileExtension != ".xlsx")
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Only .xlsx files are supported.");
        }

        ImportWorkbookReadResult workbookReadResult;
        try
        {
            workbookReadResult = importWorkbookService.ReadWorkbook(request.FileContent);
        }
        catch (Exception)
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Invalid Excel file content.");
        }

        return await ValidateWorkbookRowsAsync(
            request.ImportType.Trim(), request.FileName.Trim(), workbookReadResult, tenantId.Value, cancellationToken);
    }

    public async Task<ServiceResult<ImportValidationResultResponse>> ValidateRowsAsync(
        ValidateImportRowsRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ImportType) || string.IsNullOrWhiteSpace(request.FileName))
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Import type and file name are required.");
        }

        if (!SupportedTemplates.ContainsKey(request.ImportType.Trim()))
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status404NotFound, $"Unsupported import type '{request.ImportType}'.");
        }

        if (request.Headers is null || request.Rows is null || request.Rows.Any(row => row is null || row.Values is null))
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "Import preview rows are required.");
        }

        var rows = request.Rows.Select((row, index) =>
        {
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, value) in row.Values)
            {
                values[key] = value ?? string.Empty;
            }

            return new ImportWorkbookRow(index + 2, values);
        }).ToArray();

        var workbook = new ImportWorkbookReadResult("Edited preview", request.Headers.ToArray(), rows);
        return await ValidateWorkbookRowsAsync(
            request.ImportType.Trim(), request.FileName.Trim(), workbook, tenantId.Value, cancellationToken);
    }

    private async Task<ServiceResult<ImportValidationResultResponse>> ValidateWorkbookRowsAsync(
        string importType, string fileName, ImportWorkbookReadResult workbookReadResult, Guid tenantId,
        CancellationToken cancellationToken)
    {
        var expectedColumns = SupportedTemplates[importType];
        var errors = new List<ImportValidationErrorResponse>();
        var totalRows = workbookReadResult.Rows.Count;
        if (totalRows == 0)
        {
            errors.Add(new ImportValidationErrorResponse
            {
                RowNumber = 0,
                ColumnName = "*",
                Category = "Schema",
                Message = "Template contains no data rows.",
            });
        }

        var validationErrors = await importValidationEngine.ValidateAsync(
            new ImportValidationContext(
                tenantId,
                importType,
                expectedColumns,
                workbookReadResult),
            cancellationToken);

        errors.AddRange(validationErrors);
        EnrichValidationErrors(errors, workbookReadResult);

        var invalidRows = errors
            .Where(x => x.RowNumber > 1)
            .Select(x => x.RowNumber)
            .Distinct()
            .Count();

        if (errors.Count > 0 && invalidRows == 0 && totalRows > 0)
        {
            invalidRows = totalRows;
        }

        var validRows = Math.Max(totalRows - invalidRows, 0);
        var status = errors.Count > 0 ? ImportJobStatus.FailedValidation : ImportJobStatus.Validated;

        var importJob = new ImportJob
        {
            TenantId = tenantId,
            ImportType = importType.ToLowerInvariant(),
            SourceFileName = fileName,
            Status = status,
            TotalRows = totalRows,
            ValidRows = validRows,
            InvalidRows = invalidRows,
            RequestedByUserId = Guid.Empty,
            ValidatedAtUtc = DateTime.UtcNow,
            ErrorSummary = errors.Count == 0 ? null : string.Join(" | ", errors.Select(x => x.Message)),
            ValidatedRowsJson = status == ImportJobStatus.Validated
                ? JsonSerializer.Serialize(workbookReadResult.Rows)
                : null,
        };

        dbContext.ImportJobs.Add(importJob);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            eventType: "imports.validation.completed",
            tenantId: tenantId,
            actorUserId: null,
            targetUserId: null,
            entityName: nameof(ImportJob),
            entityId: importJob.Id.ToString(),
            description: errors.Count == 0 ? "Import file validated." : "Import file validation failed.",
            metadata: new { importJob.ImportType, importJob.TotalRows, importJob.ValidRows, importJob.InvalidRows },
            cancellationToken: cancellationToken);

        byte[]? errorWorkbookContent = null;
        string? errorWorkbookFileName = null;
        string? errorWorkbookContentType = null;

        if (errors.Count > 0)
        {
            var errorWorkbook = importWorkbookService.BuildValidationErrorWorkbook(importType, errors);
            errorWorkbookContent = errorWorkbook.Content;
            errorWorkbookFileName = errorWorkbook.FileName;
            errorWorkbookContentType = errorWorkbook.ContentType;
        }

        var result = new ImportValidationResultResponse
        {
            ImportJobId = importJob.Id,
            ImportType = importJob.ImportType,
            SourceFileName = fileName,
            Status = importJob.Status,
            TotalRows = importJob.TotalRows,
            ValidRows = importJob.ValidRows,
            InvalidRows = importJob.InvalidRows,
            ErrorWorkbookFileName = errorWorkbookFileName,
            ErrorWorkbookContentType = errorWorkbookContentType,
            ErrorWorkbookContent = errorWorkbookContent,
            Errors = errors,
            PreviewHeaders = workbookReadResult.Headers
                .Concat(expectedColumns)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            PreviewRows = workbookReadResult.Rows.Select(row => new ImportPreviewRowResponse
            {
                RowNumber = row.RowNumber,
                Values = row.Values,
            }).ToArray(),
        };

        return ServiceResult<ImportValidationResultResponse>.Success(result);
    }

    private static void EnrichValidationErrors(
        IEnumerable<ImportValidationErrorResponse> errors,
        ImportWorkbookReadResult workbook)
    {
        var headers = workbook.Headers.ToArray();
        foreach (var error in errors)
        {
            error.SheetName = string.IsNullOrWhiteSpace(error.SheetName) ? workbook.SheetName : error.SheetName;
            error.FieldName = string.IsNullOrWhiteSpace(error.FieldName) ? error.ColumnName : error.FieldName;
            error.Cause = string.IsNullOrWhiteSpace(error.Cause) ? error.Message : error.Cause;

            var columnIndex = Array.FindIndex(headers, header =>
                header.Equals(error.ColumnName, StringComparison.OrdinalIgnoreCase));
            error.ColumnReference = string.IsNullOrWhiteSpace(error.ColumnReference)
                ? columnIndex >= 0 ? ToExcelColumnReference(columnIndex + 1) : error.ColumnName
                : error.ColumnReference;

            if (string.IsNullOrWhiteSpace(error.SuggestedAction))
            {
                error.SuggestedAction = error.Category.Equals("Schema", StringComparison.OrdinalIgnoreCase)
                    ? "Download a fresh template, restore the required headers, and upload the corrected workbook."
                    : error.Category.Equals("ReferenceExistence", StringComparison.OrdinalIgnoreCase)
                        ? "Correct the reference or create the referenced record, then validate the rows again."
                        : error.Category.Equals("TypeConversion", StringComparison.OrdinalIgnoreCase)
                            ? "Enter a value in the required format, then validate the rows again."
                            : "Correct the highlighted field, then validate the rows again.";
            }

            error.RetryAction = string.IsNullOrWhiteSpace(error.RetryAction)
                ? error.Category.Equals("Schema", StringComparison.OrdinalIgnoreCase)
                    ? "upload-corrected-file"
                    : "edit-and-revalidate"
                : error.RetryAction;
        }
    }

    private static string ToExcelColumnReference(int columnNumber)
    {
        var reference = string.Empty;
        while (columnNumber > 0)
        {
            columnNumber--;
            reference = (char)('A' + columnNumber % 26) + reference;
            columnNumber /= 26;
        }

        return reference;
    }

    public async Task<ServiceResult<ImportJobStatusResponse>> SubmitAsync(Guid importJobId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        // Atomic lock: stamp SubmittedAtUtc only while the job is still unsubmitted (Status=Validated,
        // SubmittedAtUtc=null). A second concurrent call sees 0 rows affected and returns 409,
        // preventing double-execution of the import.
        var locked = await dbContext.ImportJobs
            .Where(x => x.Id == importJobId && x.TenantId == tenantId.Value
                     && x.Status == ImportJobStatus.Validated
                     && x.SubmittedAtUtc == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(j => j.SubmittedAtUtc, DateTime.UtcNow),
                cancellationToken);

        if (locked == 0)
        {
            var existing = await dbContext.ImportJobs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == importJobId && x.TenantId == tenantId.Value, cancellationToken);

            if (existing is null)
                return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status404NotFound, "Import job was not found.");

            if (existing.SubmittedAtUtc.HasValue ||
                existing.Status is ImportJobStatus.Imported or ImportJobStatus.ImportFailed)
                return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status409Conflict, "This import job has already been submitted.");

            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status400BadRequest, "Only validated import jobs can be submitted.");
        }

        // ExecuteUpdateAsync bypasses the change tracker; reload fresh from DB.
        var job = await dbContext.ImportJobs
            .FirstOrDefaultAsync(x => x.Id == importJobId && x.TenantId == tenantId.Value, cancellationToken);

        if (string.IsNullOrEmpty(job!.ValidatedRowsJson))
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status422UnprocessableEntity, "Import job has no validated row data. Please re-validate the file.");
        }

        if (!_executors.TryGetValue(job.ImportType, out var executor))
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status400BadRequest, $"No executor registered for import type '{job.ImportType}'.");
        }

        var rows = JsonSerializer.Deserialize<List<ImportWorkbookRow>>(job.ValidatedRowsJson) ?? [];

        // SubmittedAtUtc is already set by the atomic update above.
        job.Status = ImportJobStatus.Imported;

        ImportExecuteResult executeResult;
        try
        {
            executeResult = await executor.ExecuteAsync(tenantId.Value, rows, cancellationToken);

            if (executeResult.Errors.Count > 0)
            {
                job.Status = ImportJobStatus.ImportFailed;
                job.ErrorSummary = string.Join(" | ", executeResult.Errors.Take(10));
            }
        }
        catch (Exception ex)
        {
            job.Status = ImportJobStatus.ImportFailed;
            job.ErrorSummary = ex.Message;
            executeResult = new ImportExecuteResult(0, 0, 0, [ex.Message]);
        }

        job.CompletedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            eventType: "imports.submitted",
            tenantId: tenantId.Value,
            actorUserId: null,
            targetUserId: null,
            entityName: nameof(ImportJob),
            entityId: job.Id.ToString(),
            description: "Import job submitted.",
            metadata: new { job.ImportType, job.TotalRows, job.ValidRows, job.InvalidRows },
            cancellationToken: cancellationToken);

        return ServiceResult<ImportJobStatusResponse>.Success(MapStatus(job));
    }

    public async Task<ServiceResult<ImportJobStatusResponse>> GetStatusAsync(Guid importJobId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var job = await dbContext.ImportJobs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == importJobId && x.TenantId == tenantId.Value, cancellationToken);

        if (job is null)
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status404NotFound, "Import job was not found.");
        }

        return ServiceResult<ImportJobStatusResponse>.Success(MapStatus(job));
    }

    public async Task<ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>> GetHistoryAsync(
        string? importType, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>.Failure(
                StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = dbContext.ImportJobs
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId.Value);

        if (!string.IsNullOrWhiteSpace(importType))
        {
            var normalised = importType.Trim().ToLowerInvariant();
            query = query.Where(x => x.ImportType == normalised);
        }

        var items = await query
            .OrderByDescending(x => x.ValidatedAtUtc ?? x.SubmittedAtUtc ?? x.CompletedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ImportJobHistoryItemResponse
            {
                ImportJobId = x.Id,
                ImportType = x.ImportType,
                SourceFileName = x.SourceFileName,
                Status = x.Status,
                TotalRows = x.TotalRows,
                ValidRows = x.ValidRows,
                InvalidRows = x.InvalidRows,
                RequestedByUserId = x.RequestedByUserId,
                ValidatedAtUtc = x.ValidatedAtUtc,
                SubmittedAtUtc = x.SubmittedAtUtc,
                CompletedAtUtc = x.CompletedAtUtc,
                ErrorSummary = x.ErrorSummary,
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>.Success(items);
    }

    private static ImportJobStatusResponse MapStatus(ImportJob job)
    {
        var previewRows = job.Status == ImportJobStatus.Validated && !job.SubmittedAtUtc.HasValue
            ? JsonSerializer.Deserialize<List<ImportWorkbookRow>>(job.ValidatedRowsJson ?? "[]") ?? []
            : [];

        return new ImportJobStatusResponse
        {
            ImportJobId = job.Id,
            ImportType = job.ImportType,
            SourceFileName = job.SourceFileName,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ValidRows = job.ValidRows,
            InvalidRows = job.InvalidRows,
            ValidatedAtUtc = job.ValidatedAtUtc,
            SubmittedAtUtc = job.SubmittedAtUtc,
            CompletedAtUtc = job.CompletedAtUtc,
            ErrorSummary = job.ErrorSummary,
            PreviewHeaders = SupportedTemplates.GetValueOrDefault(job.ImportType) ?? [],
            PreviewRows = previewRows.Select(row => new ImportPreviewRowResponse
            {
                RowNumber = row.RowNumber,
                Values = row.Values,
            }).ToArray(),
        };
    }
}
