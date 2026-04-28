using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SupplierCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<Supplier>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Supplier> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateSupplierRequest request = (CreateSupplierRequest)input;
        var validation = Validate(request.SupplierNumber, request.Name);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override Task<ServiceResult<IEntityResponse<Supplier>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Supplier> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateSupplierRequest request = (CreateSupplierRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return Task.FromResult<ServiceResult<IEntityResponse<Supplier>>?>(null);
        }

        var normalizedNumber = request.SupplierNumber.Trim().ToUpperInvariant();
        var exists = context.Suppliers.GetByTenant(tenantId.Value)
            .Any(x => x.SupplierNumber.ToUpper() == normalizedNumber);

        if (exists)
        {
            var conflict = ServiceResult<IEntityResponse<Supplier>>.Failure(StatusCodes.Status409Conflict, "A supplier with the same number already exists.");
            return Task.FromResult<ServiceResult<IEntityResponse<Supplier>>?>(conflict);
        }

        return Task.FromResult<ServiceResult<IEntityResponse<Supplier>>?>(null);
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Supplier> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateSupplierRequest request = (UpdateSupplierRequest)input;
        var validation = Validate(request.SupplierNumber, request.Name);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Supplier>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Supplier> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateSupplierRequest request = (UpdateSupplierRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedNumber = request.SupplierNumber.Trim().ToUpperInvariant();
        var exists = await context.Suppliers.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.SupplierNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Supplier>>.Failure(StatusCodes.Status409Conflict, "A supplier with the same number already exists.");
        }

        return null;
    }

    public override async Task<Supplier> GetAddToDbObjectAsync(ICreateInput<Supplier> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Supplier> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Supplier> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        UpdateSupplierRequest request = (UpdateSupplierRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var supplier = await context.Suppliers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (supplier is null)
        {
            return null!;
        }

        request.Adapt(supplier);
        Normalize(supplier);

        return supplier;
    }

    protected override async Task<Supplier> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var supplier = await context.Suppliers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return supplier ?? null!;
    }

    protected override string GetNotFoundMessage() => "Supplier not found.";

    private static Dictionary<string, string[]> Validate(string supplierNumber, string name)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(supplierNumber))
        {
            errors[nameof(CreateSupplierRequest.SupplierNumber)] = ["Supplier number is required."];
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            errors[nameof(CreateSupplierRequest.Name)] = ["Name is required."];
        }

        return errors;
    }

    private static void Normalize(Supplier supplier)
    {
        supplier.SupplierNumber = supplier.SupplierNumber.Trim().ToUpperInvariant();
        supplier.Name = supplier.Name.Trim();
        supplier.ContactName = NormalizeOptional(supplier.ContactName);
        supplier.Email = NormalizeOptional(supplier.Email);
        supplier.PhoneNumber = NormalizeOptional(supplier.PhoneNumber);
        supplier.Address = NormalizeOptional(supplier.Address);
        supplier.PaymentTerms = NormalizeOptional(supplier.PaymentTerms);
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
