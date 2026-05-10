using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectsQuery, ServiceResult<IReadOnlyCollection<ProjectListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectListItemResponse>>> Handle(GetProjectsQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<IFilteredQueryService<Project, ProjectListFilterRequest>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var filter = new ProjectListFilterRequest
        {
            Status = request.Status,
            RelatedTenantId = request.RelatedTenantId
        };

        var result = await queryService.GetAllAsync(filter, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
            {
                return ServiceResult<IReadOnlyCollection<ProjectListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<IReadOnlyCollection<ProjectListItemResponse>>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as ProjectListItemResponse ?? item.Adapt<ProjectListItemResponse>())
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProjectListItemResponse>>.Success(mapped);
    }
}

