using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeleteProjectAssignmentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<DeleteProjectAssignmentCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(DeleteProjectAssignmentCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<Project, ProjectAssignment>>();
        var result = await commandService.DeleteAsync(request.ProjectId, request.AssignmentId, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
            {
                return ServiceResult<bool>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<bool>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<bool>.Success(true);
    }
}
