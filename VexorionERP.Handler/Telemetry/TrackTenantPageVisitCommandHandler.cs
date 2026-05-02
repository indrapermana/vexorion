using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class TrackTenantPageVisitCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<TrackTenantPageVisitCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(TrackTenantPageVisitCommand request, CancellationToken cancellationToken)
    {
        var currentTenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var normalizedPath = request.Request.Path.Trim();
        if (normalizedPath.Length == 0)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Path is required.");
        }

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantId = currentTenantProvider.TenantId.Value;
        var visitDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var existing = await dbContext.TenantPageVisits
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Path == normalizedPath && x.VisitDate == visitDate, cancellationToken);

        if (existing is null)
        {
            dbContext.TenantPageVisits.Add(new TenantPageVisit
            {
                TenantId = tenantId,
                Path = normalizedPath,
                VisitDate = visitDate,
                VisitCount = 1,
                LastVisitedAtUtc = DateTime.UtcNow,
            });
        }
        else
        {
            existing.VisitCount += 1;
            existing.LastVisitedAtUtc = DateTime.UtcNow;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }
}
