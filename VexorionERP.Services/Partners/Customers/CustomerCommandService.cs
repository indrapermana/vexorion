using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CustomerCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ICustomerCommandService
{
    public async Task<ServiceResult<CustomerDetailsResponse>> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CustomerNumber, request.Name);
        if (validation.Count > 0)
        {
            return ServiceResult<CustomerDetailsResponse>.ValidationFailure(validation);
        }

        var normalizedNumber = request.CustomerNumber.Trim().ToUpperInvariant();
        var numberExists = await dbContext.Customers.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.CustomerNumber.ToUpper() == normalizedNumber,
            cancellationToken);

        if (numberExists)
        {
            return ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A customer with the same number already exists.");
        }

        var customer = request.Adapt<Customer>();
        customer.TenantId = currentTenantProvider.TenantId.Value;
        Normalize(customer);

        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<CustomerDetailsResponse>.Success(customer.Adapt<CustomerDetailsResponse>());
    }

    public async Task<ServiceResult<CustomerDetailsResponse>> UpdateAsync(Guid customerId, UpdateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CustomerNumber, request.Name);
        if (validation.Count > 0)
        {
            return ServiceResult<CustomerDetailsResponse>.ValidationFailure(validation);
        }

        var customer = await dbContext.Customers.FirstOrDefaultAsync(x => x.Id == customerId, cancellationToken);
        if (customer is null)
        {
            return ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Customer not found.");
        }

        var normalizedNumber = request.CustomerNumber.Trim().ToUpperInvariant();
        var numberExists = await dbContext.Customers.AnyAsync(
            x => x.Id != customerId && x.TenantId == currentTenantProvider.TenantId.Value && x.CustomerNumber.ToUpper() == normalizedNumber,
            cancellationToken);

        if (numberExists)
        {
            return ServiceResult<CustomerDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A customer with the same number already exists.");
        }

        request.Adapt(customer);
        Normalize(customer);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<CustomerDetailsResponse>.Success(customer.Adapt<CustomerDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid customerId, CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers.FirstOrDefaultAsync(x => x.Id == customerId, cancellationToken);
        if (customer is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Customer not found.");
        }

        dbContext.Customers.Remove(customer);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string customerNumber, string name)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(customerNumber))
        {
            errors[nameof(CreateCustomerRequest.CustomerNumber)] = ["Customer number is required."];
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            errors[nameof(CreateCustomerRequest.Name)] = ["Name is required."];
        }

        return errors;
    }

    private static void Normalize(Customer customer)
    {
        customer.CustomerNumber = customer.CustomerNumber.Trim().ToUpperInvariant();
        customer.Name = customer.Name.Trim();
        customer.ContactName = NormalizeOptional(customer.ContactName);
        customer.Email = NormalizeOptional(customer.Email);
        customer.PhoneNumber = NormalizeOptional(customer.PhoneNumber);
        customer.BillingAddress = NormalizeOptional(customer.BillingAddress);
        customer.ShippingAddress = NormalizeOptional(customer.ShippingAddress);
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
