using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
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

        tenant.Name = request.Request.Name.Trim();
        tenant.Domain = string.IsNullOrWhiteSpace(request.Request.Domain) ? null : request.Request.Domain.Trim();
        tenant.IsActive = request.Request.IsActive;
        tenant.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<TenantListItemResponse>.Success(tenant.Adapt<TenantListItemResponse>());
    }
}
