using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateProjectAssignmentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreateProjectAssignmentCommand, ServiceResult<ProjectAssignmentDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectAssignmentDetailsResponse>> Handle(CreateProjectAssignmentCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<Project, ProjectAssignment>>();
        var result = await commandService.CreateAsync(request.ProjectId, request.Request, cancellationToken);

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
