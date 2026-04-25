using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Partners.Customers;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class CustomerQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ICustomerQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<CustomerListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<CustomerListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var customers = await dbContext.Customers.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<CustomerListItemResponse>>.Success(customers.Adapt<IReadOnlyCollection<CustomerListItemResponse>>());
    }

    public async Task<ServiceResult<CustomerDetailsResponse>> GetByIdAsync(Guid customerId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var customer = await dbContext.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == customerId, cancellationToken);
        return customer is null
            ? ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Customer not found.")
            : ServiceResult<CustomerDetailsResponse>.Success(customer.Adapt<CustomerDetailsResponse>());
    }
}