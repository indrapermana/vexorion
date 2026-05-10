using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface IProjectTimelineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>> GetAsync(Guid projectId, CancellationToken cancellationToken = default);
}
