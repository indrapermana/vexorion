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

public sealed class UpdateTenantCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateTenantCommand, ServiceResult<TenantListItemResponse>>
{
    public async ValueTask<ServiceResult<TenantListItemResponse>> Handle(
        UpdateTenantCommand request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);

        if (tenant is null)
        {
            return ServiceResult<TenantListItemResponse>.Failure(StatusCodes.Status404NotFound, "Tenant not found.");
        }

        var wasActive = tenant.IsActive;
        var previousName = tenant.Name;
        var previousDomain = tenant.Domain;

        tenant.Name = request.Request.Name.Trim();
        tenant.Domain = string.IsNullOrWhiteSpace(request.Request.Domain) ? null : request.Request.Domain.Trim();
        tenant.IsActive = request.Request.IsActive;
        tenant.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        if (wasActive && !tenant.IsActive)
        {
            var tokenService = serviceProvider.GetRequiredService<ITokenService>();
            await tokenService.RevokeAllTenantRefreshTokensAsync(tenant.Id, null, cancellationToken);
        }

        var auditLogger = serviceProvider.GetRequiredService<IAuditLogger>();
        await auditLogger.LogAsync(
            wasActive == tenant.IsActive ? "tenants.updated" : "tenants.status_changed",
            tenant.Id,
            request.ActorUserId,
            null,
            nameof(Tenant),
            tenant.Id.ToString(),
            wasActive == tenant.IsActive ? "Tenant details updated." : tenant.IsActive ? "Tenant reactivated." : "Tenant suspended.",
            new
            {
                Before = new { Name = previousName, Domain = previousDomain, IsActive = wasActive },
                After = new { tenant.Name, tenant.Domain, tenant.IsActive },
                RefreshSessionsRevoked = wasActive && !tenant.IsActive
            },
            cancellationToken);

        return ServiceResult<TenantListItemResponse>.Success(tenant.Adapt<TenantListItemResponse>());
    }
}
