using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetAuditLogsQuery(
    string? EventType,
    string? EntityName,
    DateTime? FromUtc,
    DateTime? ToUtc,
    int Page,
    int PageSize) : IRequest<ServiceResult<AuditLogListResponse>>;

public sealed class GetAuditLogsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetAuditLogsQuery, ServiceResult<AuditLogListResponse>>
{
    public ValueTask<ServiceResult<AuditLogListResponse>> Handle(GetAuditLogsQuery request, CancellationToken cancellationToken)
    {
        var auditLogQueryService = serviceProvider.GetRequiredService<IAuditLogQueryService>();
        return new ValueTask<ServiceResult<AuditLogListResponse>>(auditLogQueryService.GetAsync(
            request.EventType,
            request.EntityName,
            request.FromUtc,
            request.ToUtc,
            request.Page,
            request.PageSize,
            cancellationToken));
    }
}
