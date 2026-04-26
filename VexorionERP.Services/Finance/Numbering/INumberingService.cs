using VexorionERP.Contracts.Finance.Numbering;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface INumberingService
{
    Task<ServiceResult<string>> GenerateNextAsync(string documentType, DateOnly documentDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<NumberingSequenceResponse>> UpsertAsync(UpsertNumberingSequenceRequest request, CancellationToken cancellationToken = default);
}
