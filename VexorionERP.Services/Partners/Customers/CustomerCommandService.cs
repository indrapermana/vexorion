using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CustomerCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<Customer>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Customer> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateCustomerRequest request = (CreateCustomerRequest)input;
        var validation = Validate(request.CustomerNumber, request.Name);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override Task<ServiceResult<IEntityResponse<Customer>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Customer> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateCustomerRequest request = (CreateCustomerRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return Task.FromResult<ServiceResult<IEntityResponse<Customer>>?>(null);
        }

        var normalizedNumber = request.CustomerNumber.Trim().ToUpperInvariant();
        var exists = context.Customers.GetByTenant(tenantId.Value)
            .Any(x => x.CustomerNumber.ToUpper() == normalizedNumber);

        if (exists)
        {
            var conflict = ServiceResult<IEntityResponse<Customer>>.Failure(StatusCodes.Status409Conflict, "A customer with the same number already exists.");
            return Task.FromResult<ServiceResult<IEntityResponse<Customer>>?>(conflict);
        }

        return Task.FromResult<ServiceResult<IEntityResponse<Customer>>?>(null);
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Customer> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateCustomerRequest request = (UpdateCustomerRequest)input;
        var validation = Validate(request.CustomerNumber, request.Name);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Customer>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Customer> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateCustomerRequest request = (UpdateCustomerRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedNumber = request.CustomerNumber.Trim().ToUpperInvariant();
        var exists = await context.Customers.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.CustomerNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Customer>>.Failure(StatusCodes.Status409Conflict, "A customer with the same number already exists.");
        }

        return null;
    }

    public override async Task<Customer> GetAddToDbObjectAsync(ICreateInput<Customer> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Customer> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Customer> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        UpdateCustomerRequest request = (UpdateCustomerRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var customer = await context.Customers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (customer is null)
        {
            return null!;
        }

        request.Adapt(customer);
        Normalize(customer);

        return customer;
    }

    protected override async Task<Customer> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var customer = await context.Customers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return customer ?? null!;
    }

    protected override string GetNotFoundMessage() => "Customer not found.";

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

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
