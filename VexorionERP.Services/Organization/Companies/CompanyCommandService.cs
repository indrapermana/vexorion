using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CompanyCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<Company>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Company> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateCompanyRequest request = (CreateCompanyRequest)input;
        var validation = Validate(request.Name, request.Code);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override Task<ServiceResult<IEntityResponse<Company>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Company> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateCompanyRequest request = (CreateCompanyRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return Task.FromResult<ServiceResult<IEntityResponse<Company>>?>(null);
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var exists = context.Companies.GetByTenant(tenantId.Value)
            .Any(x => x.Code.ToUpper() == normalizedCode);

        if (exists)
        {
            var conflict = ServiceResult<IEntityResponse<Company>>.Failure(StatusCodes.Status409Conflict, "A company with the same code already exists.");
            return Task.FromResult<ServiceResult<IEntityResponse<Company>>?>(conflict);
        }

        return Task.FromResult<ServiceResult<IEntityResponse<Company>>?>(null);
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Company> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateCompanyRequest request = (UpdateCompanyRequest)input;
        var validation = Validate(request.Name, request.Code);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Company>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Company> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateCompanyRequest request = (UpdateCompanyRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var exists = await context.Companies.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.Code.ToUpper() == normalizedCode, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Company>>.Failure(StatusCodes.Status409Conflict, "A company with the same code already exists.");
        }

        return null;
    }

    public override async Task<Company> GetAddToDbObjectAsync(ICreateInput<Company> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Company> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Company> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        UpdateCompanyRequest request = (UpdateCompanyRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var company = await context.Companies.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (company is null)
        {
            return null!;
        }

        request.Adapt(company);
        Normalize(company);

        return company;
    }

    protected override async Task<Company> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var company = await context.Companies.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return company ?? null!;
    }

    protected override string GetNotFoundMessage() => "Company not found.";

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
