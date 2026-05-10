using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectPartyByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectPartyByIdQuery, ServiceResult<ProjectPartyDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectPartyDetailsResponse>> Handle(GetProjectPartyByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<Project, ProjectParty>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.ProjectId, request.ProjectPartyId, dbContext, cancellationToken);

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
