using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateProjectAssignmentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateProjectAssignmentCommand, ServiceResult<ProjectAssignmentDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectAssignmentDetailsResponse>> Handle(UpdateProjectAssignmentCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<Project, ProjectAssignment>>();
        var result = await commandService.UpdateAsync(request.ProjectId, request.AssignmentId, request.Request, cancellationToken);

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
