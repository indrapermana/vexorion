using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateProjectPartyCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateProjectPartyCommand, ServiceResult<ProjectPartyDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectPartyDetailsResponse>> Handle(UpdateProjectPartyCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<Project, ProjectParty>>();
        var result = await commandService.UpdateAsync(request.ProjectId, request.ProjectPartyId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
            {
                return ServiceResult<ProjectPartyDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<ProjectPartyDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<ProjectPartyDetailsResponse>.Success(result.Value!.Adapt<ProjectPartyDetailsResponse>());
    }
}
