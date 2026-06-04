using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectAssignmentsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectAssignmentsQuery, ServiceResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>> Handle(GetProjectAssignmentsQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<Project, ProjectAssignment>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetAllForParentAsync(request.ProjectId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
            {
                return ServiceResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as ProjectAssignmentListItemResponse ?? item.Adapt<ProjectAssignmentListItemResponse>())
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>.Success(mapped);
    }
}
