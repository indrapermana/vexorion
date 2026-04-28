using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CustomerPaymentQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ICustomerPaymentQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payments = await dbContext.CustomerPayments.AsNoTracking()
            .Where(x => x.TenantId == currentTenantProvider.TenantId.Value)
            .OrderByDescending(x => x.PaymentDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>.Success(payments.Adapt<IReadOnlyCollection<CustomerPaymentListItemResponse>>());
    }

    public async Task<ServiceResult<CustomerPaymentDetailsResponse>> GetByIdAsync(Guid customerPaymentId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payment = await dbContext.CustomerPayments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == customerPaymentId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);

        return payment is null
            ? ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Customer payment not found.")
            : ServiceResult<CustomerPaymentDetailsResponse>.Success(payment.Adapt<CustomerPaymentDetailsResponse>());
    }
}
