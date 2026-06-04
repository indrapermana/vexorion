using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectAssignmentByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectAssignmentByIdQuery, ServiceResult<ProjectAssignmentDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectAssignmentDetailsResponse>> Handle(GetProjectAssignmentByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<Project, ProjectAssignment>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.ProjectId, request.AssignmentId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
            {
                return ServiceResult<ProjectAssignmentDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<ProjectAssignmentDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<ProjectAssignmentDetailsResponse>.Success(result.Value!.Adapt<ProjectAssignmentDetailsResponse>());
    }
}
