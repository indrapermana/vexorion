using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IImportJobService
{
    Task<ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>> GetAvailableImportTypesAsync(CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportTemplateResponse>> DownloadTemplateAsync(string importType, CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportValidationResultResponse>> ValidateAsync(ValidateImportFileRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportJobStatusResponse>> SubmitAsync(Guid importJobId, CancellationToken cancellationToken = default);

    Task<ServiceResult<ImportJobStatusResponse>> GetStatusAsync(Guid importJobId, CancellationToken cancellationToken = default);
}
