using VexorionERP.Contracts.Auditing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IAuditLogQueryService
{
    Task<ServiceResult<AuditLogListResponse>> GetAsync(
        string? eventType,
        string? entityName,
        DateTime? fromUtc,
        DateTime? toUtc,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}
