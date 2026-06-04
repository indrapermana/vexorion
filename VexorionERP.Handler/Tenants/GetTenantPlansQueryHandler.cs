using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantPlansQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantPlansQuery, ServiceResult<IReadOnlyCollection<TenantPlanResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<TenantPlanResponse>>> Handle(
        GetTenantPlansQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var plans = await dbContext.TenantPlans
            .AsNoTracking()
            .Where(p => p.TenantId == request.TenantId)
            .OrderByDescending(p => p.EffectiveFromUtc)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var result = plans.Select(p =>
        {
            var response = p.Adapt<TenantPlanResponse>();
            response.IsActive = p.EffectiveFromUtc <= now && (p.EffectiveToUtc == null || p.EffectiveToUtc > now);
            return response;
        }).ToList();

        return ServiceResult<IReadOnlyCollection<TenantPlanResponse>>.Success(result);
    }
}
