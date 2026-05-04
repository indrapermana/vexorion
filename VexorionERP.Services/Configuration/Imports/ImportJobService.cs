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
    IAuditLogger auditLogger) : IImportJobService
{
    private static readonly Dictionary<string, string[]> SupportedTemplates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["customer"] = ["CustomerNumber", "Name", "Email", "PhoneNumber", "BillingAddress"],
        ["supplier"] = ["SupplierNumber", "Name", "Email", "PhoneNumber", "Address"],
        ["product"] = ["Sku", "Name", "CategoryName", "Unit", "ListPrice"],
        ["sales-order"] = ["OrderNumber", "OrderDate", "CustomerNumber", "WarehouseCode", "CurrencyCode"],
        ["purchase-order"] = ["OrderNumber", "OrderDate", "SupplierNumber", "WarehouseCode", "CurrencyCode"],
    };

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

        if (!SupportedTemplates.TryGetValue(request.ImportType.Trim(), out var expectedColumns))
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status404NotFound, $"Unsupported import type '{request.ImportType}'.");
        }

        if (request.FileContent is null || request.FileContent.Length == 0)
        {
            return ServiceResult<ImportValidationResultResponse>.Failure(StatusCodes.Status400BadRequest, "File content is required.");
        }

        var errors = new List<ImportValidationErrorResponse>();

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
                tenantId.Value,
                request.ImportType.Trim(),
                expectedColumns,
                workbookReadResult),
            cancellationToken);

        errors.AddRange(validationErrors);

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
            TenantId = tenantId.Value,
            ImportType = request.ImportType.Trim().ToLowerInvariant(),
            SourceFileName = request.FileName.Trim(),
            Status = status,
            TotalRows = totalRows,
            ValidRows = validRows,
            InvalidRows = invalidRows,
            RequestedByUserId = Guid.Empty,
            ValidatedAtUtc = DateTime.UtcNow,
            ErrorSummary = errors.Count == 0 ? null : string.Join(" | ", errors.Select(x => x.Message)),
        };

        dbContext.ImportJobs.Add(importJob);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            eventType: "imports.validation.completed",
            tenantId: tenantId.Value,
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
            var errorWorkbook = importWorkbookService.BuildValidationErrorWorkbook(request.ImportType, errors);
            errorWorkbookContent = errorWorkbook.Content;
            errorWorkbookFileName = errorWorkbook.FileName;
            errorWorkbookContentType = errorWorkbook.ContentType;
        }

        var result = new ImportValidationResultResponse
        {
            ImportJobId = importJob.Id,
            ImportType = importJob.ImportType,
            Status = importJob.Status,
            TotalRows = importJob.TotalRows,
            ValidRows = importJob.ValidRows,
            InvalidRows = importJob.InvalidRows,
            ErrorWorkbookFileName = errorWorkbookFileName,
            ErrorWorkbookContentType = errorWorkbookContentType,
            ErrorWorkbookContent = errorWorkbookContent,
            Errors = errors,
        };

        return ServiceResult<ImportValidationResultResponse>.Success(result);
    }

    public async Task<ServiceResult<ImportJobStatusResponse>> SubmitAsync(Guid importJobId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var job = await dbContext.ImportJobs
            .FirstOrDefaultAsync(x => x.Id == importJobId && x.TenantId == tenantId.Value, cancellationToken);

        if (job is null)
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status404NotFound, "Import job was not found.");
        }

        if (job.Status != ImportJobStatus.Validated)
        {
            return ServiceResult<ImportJobStatusResponse>.Failure(StatusCodes.Status400BadRequest, "Only validated import jobs can be submitted.");
        }

        var now = DateTime.UtcNow;
        job.SubmittedAtUtc = now;
        job.CompletedAtUtc = now;
        job.Status = ImportJobStatus.Imported;

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

    private static ImportJobStatusResponse MapStatus(ImportJob job)
    {
        return new ImportJobStatusResponse
        {
            ImportJobId = job.Id,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ValidRows = job.ValidRows,
            InvalidRows = job.InvalidRows,
            ValidatedAtUtc = job.ValidatedAtUtc,
            SubmittedAtUtc = job.SubmittedAtUtc,
            CompletedAtUtc = job.CompletedAtUtc,
            ErrorSummary = job.ErrorSummary,
        };
    }
}
