using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class VendorPaymentQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IVendorPaymentQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payments = await dbContext.VendorPayments.AsNoTracking()
            .Where(x => x.TenantId == currentTenantProvider.TenantId.Value)
            .OrderByDescending(x => x.PaymentDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>.Success(payments.Adapt<IReadOnlyCollection<VendorPaymentListItemResponse>>());
    }

    public async Task<ServiceResult<VendorPaymentDetailsResponse>> GetByIdAsync(Guid vendorPaymentId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payment = await dbContext.VendorPayments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == vendorPaymentId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);

        return payment is null
            ? ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Vendor payment not found.")
            : ServiceResult<VendorPaymentDetailsResponse>.Success(payment.Adapt<VendorPaymentDetailsResponse>());
    }
}
