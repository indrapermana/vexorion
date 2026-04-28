using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CustomerPaymentQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<CustomerPayment>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<CustomerPayment>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<CustomerPayment>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payments = await context.CustomerPayments.GetByTenant(tenantId.Value).AsNoTracking()
            .OrderByDescending(x => x.PaymentDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<CustomerPayment>>>.Success(payments.Adapt<IReadOnlyCollection<IEntityListResponse<CustomerPayment>>>());
    }

    public async Task<ServiceResult<IEntityResponse<CustomerPayment>>> GetByIdAsync(Guid customerPaymentId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var payment = await context.CustomerPayments.GetByTenant(tenantId.Value).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == customerPaymentId, cancellationToken);

        return payment is null
            ? ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status404NotFound, "Customer payment not found.")
            : ServiceResult<IEntityResponse<CustomerPayment>>.Success(payment.Adapt<CustomerPaymentDetailsResponse>());
    }
}
