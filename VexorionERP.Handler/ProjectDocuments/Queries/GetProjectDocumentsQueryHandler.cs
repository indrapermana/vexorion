using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectDocumentsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectDocumentsQuery, ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>> Handle(
        GetProjectDocumentsQuery request,
        CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<IFilteredQueryService<ProjectDocument, ProjectDocumentListFilterRequest>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var filter = new ProjectDocumentListFilterRequest
        {
            ProjectId = request.ProjectId,
            DocumentFolderId = request.DocumentFolderId,
            Status = request.Status,
            SearchTerm = request.SearchTerm
        };

        var result = await queryService.GetAllAsync(filter, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            return result.Validation is not null
                ? ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value))
                : ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>.Failure(
                    result.StatusCode ?? StatusCodes.Status400BadRequest,
                    result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as ProjectDocumentListItemResponse ?? item.Adapt<ProjectDocumentListItemResponse>())
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>.Success(mapped);
    }
}
