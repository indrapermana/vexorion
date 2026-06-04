using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateTenantPlanCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreateTenantPlanCommand, ServiceResult<TenantPlanResponse>>
{
    public async ValueTask<ServiceResult<TenantPlanResponse>> Handle(
        CreateTenantPlanCommand request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var auditLogger = serviceProvider.GetRequiredService<IAuditLogger>();

        // Validate threshold ordering
        if (request.Request.WarningThresholdPercent >= request.Request.SoftBlockThresholdPercent
            || request.Request.SoftBlockThresholdPercent >= request.Request.HardBlockThresholdPercent)
        {
            return ServiceResult<TenantPlanResponse>.Failure(
                StatusCodes.Status400BadRequest,
                "Thresholds must be in ascending order: Warning < SoftBlock < HardBlock.");
        }

        var now = DateTime.UtcNow;
        var activePlanBefore = await dbContext.TenantPlans
            .AsNoTracking()
            .Where(p => p.TenantId == request.TenantId
                && p.EffectiveFromUtc <= now
                && (p.EffectiveToUtc == null || p.EffectiveToUtc > now))
            .OrderByDescending(p => p.EffectiveFromUtc)
            .FirstOrDefaultAsync(cancellationToken);

        // If this is default, unset prior default for the same tenant
        if (request.Request.IsDefault)
        {
            var existingDefault = await dbContext.TenantPlans
                .Where(p => p.TenantId == request.TenantId && p.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingDefault is not null)
            {
                existingDefault.IsDefault = false;
            }
        }

        var plan = new TenantPlan
        {
            Id = Guid.NewGuid(),
            TenantId = request.TenantId,
            PlanCode = request.Request.PlanCode.Trim().ToUpperInvariant(),
            PlanName = request.Request.PlanName.Trim(),
            MaxStorageBytes = request.Request.MaxStorageBytes,
            MaxFileSizeBytes = request.Request.MaxFileSizeBytes,
            WarningThresholdPercent = request.Request.WarningThresholdPercent,
            SoftBlockThresholdPercent = request.Request.SoftBlockThresholdPercent,
            HardBlockThresholdPercent = request.Request.HardBlockThresholdPercent,
            EffectiveFromUtc = request.Request.EffectiveFromUtc,
            EffectiveToUtc = request.Request.EffectiveToUtc,
            IsDefault = request.Request.IsDefault
        };

        dbContext.TenantPlans.Add(plan);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            eventType: "tenant.plan.limit_changed",
            tenantId: request.TenantId,
            actorUserId: request.ActorUserId,
            targetUserId: null,
            entityName: nameof(TenantPlan),
            entityId: plan.Id.ToString(),
            description: $"Tenant plan limits changed to {plan.PlanCode}.",
            metadata: new
            {
                Previous = activePlanBefore is null
                    ? null
                    : new
                    {
                        activePlanBefore.PlanCode,
                        activePlanBefore.MaxStorageBytes,
                        activePlanBefore.MaxFileSizeBytes,
                        activePlanBefore.WarningThresholdPercent,
                        activePlanBefore.SoftBlockThresholdPercent,
                        activePlanBefore.HardBlockThresholdPercent
                    },
                Current = new
                {
                    plan.PlanCode,
                    plan.MaxStorageBytes,
                    plan.MaxFileSizeBytes,
                    plan.WarningThresholdPercent,
                    plan.SoftBlockThresholdPercent,
                    plan.HardBlockThresholdPercent,
                    plan.EffectiveFromUtc,
                    plan.EffectiveToUtc,
                    plan.IsDefault
                }
            },
            cancellationToken: cancellationToken);

        var response = plan.Adapt<TenantPlanResponse>();
        response.IsActive = plan.EffectiveFromUtc <= now && (plan.EffectiveToUtc == null || plan.EffectiveToUtc > now);

        return ServiceResult<TenantPlanResponse>.Success(response);
    }
}
