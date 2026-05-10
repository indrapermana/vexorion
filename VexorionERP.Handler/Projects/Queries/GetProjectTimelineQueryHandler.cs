using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectTimelineQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectTimelineQuery, ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>> Handle(GetProjectTimelineQuery request, CancellationToken cancellationToken)
    {
        var service = serviceProvider.GetRequiredService<IProjectTimelineQueryService>();
        return await service.GetAsync(request.ProjectId, cancellationToken);
    }
}
