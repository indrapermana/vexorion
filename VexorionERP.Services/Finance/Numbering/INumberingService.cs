using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface INumberingService
{
    Task<ServiceResult<string>> GenerateNextAsync(string documentType, DateOnly documentDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<NumberingSequenceResponse>> UpsertAsync(UpsertNumberingSequenceRequest request, CancellationToken cancellationToken = default);
}
