using VexorionERP.Contracts;

namespace VexorionERP.Services;

public record ImportValidationContext(
    Guid TenantId,
    string ImportType,
    IReadOnlyCollection<string> ExpectedColumns,
    ImportWorkbookReadResult Workbook);

public interface IImportValidationEngine
{
    Task<IReadOnlyCollection<ImportValidationErrorResponse>> ValidateAsync(
        ImportValidationContext context,
        CancellationToken cancellationToken = default);
}
