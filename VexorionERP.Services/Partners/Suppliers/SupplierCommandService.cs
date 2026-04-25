using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Partners.Suppliers;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Partners;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SupplierCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISupplierCommandService
{
    public async Task<ServiceResult<SupplierDetailsResponse>> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.SupplierNumber, request.Name);
        if (validation.Count > 0)
        {
            return ServiceResult<SupplierDetailsResponse>.ValidationFailure(validation);
        }

        var normalizedNumber = request.SupplierNumber.Trim().ToUpperInvariant();
        var numberExists = await dbContext.Suppliers.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.SupplierNumber.ToUpper() == normalizedNumber,
            cancellationToken);

        if (numberExists)
        {
            return ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A supplier with the same number already exists.");
        }

        var supplier = request.Adapt<Supplier>();
        supplier.TenantId = currentTenantProvider.TenantId.Value;
        Normalize(supplier);

        dbContext.Suppliers.Add(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SupplierDetailsResponse>.Success(supplier.Adapt<SupplierDetailsResponse>());
    }

    public async Task<ServiceResult<SupplierDetailsResponse>> UpdateAsync(Guid supplierId, UpdateSupplierRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.SupplierNumber, request.Name);
        if (validation.Count > 0)
        {
            return ServiceResult<SupplierDetailsResponse>.ValidationFailure(validation);
        }

        var supplier = await dbContext.Suppliers.FirstOrDefaultAsync(x => x.Id == supplierId, cancellationToken);
        if (supplier is null)
        {
            return ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Supplier not found.");
        }

        var normalizedNumber = request.SupplierNumber.Trim().ToUpperInvariant();
        var numberExists = await dbContext.Suppliers.AnyAsync(
            x => x.Id != supplierId && x.TenantId == currentTenantProvider.TenantId.Value && x.SupplierNumber.ToUpper() == normalizedNumber,
            cancellationToken);

        if (numberExists)
        {
            return ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A supplier with the same number already exists.");
        }

        request.Adapt(supplier);
        Normalize(supplier);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SupplierDetailsResponse>.Success(supplier.Adapt<SupplierDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid supplierId, CancellationToken cancellationToken = default)
    {
        var supplier = await dbContext.Suppliers.FirstOrDefaultAsync(x => x.Id == supplierId, cancellationToken);
        if (supplier is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Supplier not found.");
        }

        dbContext.Suppliers.Remove(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

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