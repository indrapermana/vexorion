using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Services;

public interface IGeneratedDocumentService
{
    Task<ServiceResult<GeneratedDocumentResponse>> GenerateAsync(GenerateDocumentRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>> ListBySourceAsync(
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<GetDocumentDownloadLinkResponse>> GetDownloadLinkAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default);

    Task<ServiceResult<DocumentInlineContentResponse>> GetInlineContentAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default);

    Task<ServiceResult<GeneratedDocumentResponse>> RegenerateAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default);
}
