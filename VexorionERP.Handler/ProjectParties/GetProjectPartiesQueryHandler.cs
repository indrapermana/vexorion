using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectPartiesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectPartiesQuery, ServiceResult<IReadOnlyCollection<ProjectPartyListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectPartyListItemResponse>>> Handle(GetProjectPartiesQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<Project, ProjectParty>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetAllForParentAsync(request.ProjectId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
            {
                return ServiceResult<IReadOnlyCollection<ProjectPartyListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<IReadOnlyCollection<ProjectPartyListItemResponse>>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as ProjectPartyListItemResponse ?? item.Adapt<ProjectPartyListItemResponse>())
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProjectPartyListItemResponse>>.Success(mapped);
    }
}
