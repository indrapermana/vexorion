using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetDocumentFoldersQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetDocumentFoldersQuery, ServiceResult<IReadOnlyCollection<DocumentFolderListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<DocumentFolderListItemResponse>>> Handle(
        GetDocumentFoldersQuery request,
        CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<IFilteredQueryService<DocumentFolder, DocumentFolderListFilterRequest>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var filter = new DocumentFolderListFilterRequest
        {
            ProjectId = request.ProjectId,
            ParentFolderId = request.ParentFolderId
        };

        var result = await queryService.GetAllAsync(filter, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            return result.Validation is not null
                ? ServiceResult<IReadOnlyCollection<DocumentFolderListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value))
                : ServiceResult<IReadOnlyCollection<DocumentFolderListItemResponse>>.Failure(
                    result.StatusCode ?? StatusCodes.Status400BadRequest,
                    result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as DocumentFolderListItemResponse ?? item.Adapt<DocumentFolderListItemResponse>())
            .ToArray();

        return ServiceResult<IReadOnlyCollection<DocumentFolderListItemResponse>>.Success(mapped);
    }
}
