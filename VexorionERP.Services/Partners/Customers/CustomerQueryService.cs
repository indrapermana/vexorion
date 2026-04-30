using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CustomerQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<Customer>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var customers = await context.Customers.GetByTenant(tenantId.Value).AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<Customer>>>.Success(AdaptEntityListResponses(customers));
    }

    public async Task<ServiceResult<IEntityResponse<Customer>>> GetByIdAsync(Guid customerId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<Customer>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var customer = await context.Customers.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == customerId, cancellationToken);
        return customer is null
            ? ServiceResult<IEntityResponse<Customer>>.Failure(StatusCodes.Status404NotFound, "Customer not found.")
            : ServiceResult<IEntityResponse<Customer>>.Success(customer.Adapt<CustomerDetailsResponse>());
    }
}
