using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CompanyCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ICompanyCommandService
{
    public async Task<ServiceResult<CompanyDetailsResponse>> CreateAsync(CreateCompanyRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.Name, request.Code);
        if (validation.Count > 0)
        {
            return ServiceResult<CompanyDetailsResponse>.ValidationFailure(validation);
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await dbContext.Companies.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.Code.ToUpper() == normalizedCode,
            cancellationToken);

        if (codeExists)
        {
            return ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A company with the same code already exists.");
        }

        var company = request.Adapt<Company>();
        company.TenantId = currentTenantProvider.TenantId.Value;
        Normalize(company);

        dbContext.Companies.Add(company);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<CompanyDetailsResponse>.Success(company.Adapt<CompanyDetailsResponse>());
    }

    public async Task<ServiceResult<CompanyDetailsResponse>> UpdateAsync(Guid companyId, UpdateCompanyRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.Name, request.Code);
        if (validation.Count > 0)
        {
            return ServiceResult<CompanyDetailsResponse>.ValidationFailure(validation);
        }

        var company = await dbContext.Companies.FirstOrDefaultAsync(x => x.Id == companyId, cancellationToken);
        if (company is null)
        {
            return ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Company not found.");
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await dbContext.Companies.AnyAsync(
            x => x.Id != companyId && x.TenantId == currentTenantProvider.TenantId.Value && x.Code.ToUpper() == normalizedCode,
            cancellationToken);

        if (codeExists)
        {
            return ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A company with the same code already exists.");
        }

        request.Adapt(company);
        Normalize(company);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<CompanyDetailsResponse>.Success(company.Adapt<CompanyDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var company = await dbContext.Companies.FirstOrDefaultAsync(x => x.Id == companyId, cancellationToken);
        if (company is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Company not found.");
        }

        dbContext.Companies.Remove(company);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string name, string code)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(name))
        {
            errors[nameof(CreateCompanyRequest.Name)] = ["Name is required."];
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            errors[nameof(CreateCompanyRequest.Code)] = ["Code is required."];
        }

        return errors;
    }

    private static void Normalize(Company company)
    {
        company.Name = company.Name.Trim();
        company.Code = company.Code.Trim().ToUpperInvariant();
        company.TaxNumber = NormalizeOptional(company.TaxNumber);
        company.Email = NormalizeOptional(company.Email);
        company.PhoneNumber = NormalizeOptional(company.PhoneNumber);
        company.AddressLine1 = NormalizeOptional(company.AddressLine1);
        company.AddressLine2 = NormalizeOptional(company.AddressLine2);
        company.City = NormalizeOptional(company.City);
        company.State = NormalizeOptional(company.State);
        company.PostalCode = NormalizeOptional(company.PostalCode);
        company.Country = NormalizeOptional(company.Country);
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
