using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class VendorPaymentQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<VendorPayment>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<VendorPayment>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<VendorPayment>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payments = await context.VendorPayments.GetByTenant(tenantId.Value).AsNoTracking()
            .OrderByDescending(x => x.PaymentDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<VendorPayment>>>.Success(AdaptEntityListResponses(payments));
    }

    public async Task<ServiceResult<IEntityResponse<VendorPayment>>> GetByIdAsync(Guid vendorPaymentId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payment = await context.VendorPayments.GetByTenant(tenantId.Value).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == vendorPaymentId, cancellationToken);

        return payment is null
            ? ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status404NotFound, "Vendor payment not found.")
            : ServiceResult<IEntityResponse<VendorPayment>>.Success(payment.Adapt<VendorPaymentDetailsResponse>());
    }
}
