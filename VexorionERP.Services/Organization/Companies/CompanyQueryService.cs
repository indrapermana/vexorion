using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Organization.Companies;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class CompanyQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ICompanyQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var companies = await dbContext.Companies.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>.Success(companies.Adapt<IReadOnlyCollection<CompanyListItemResponse>>());
    }

    public async Task<ServiceResult<CompanyDetailsResponse>> GetByIdAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var company = await dbContext.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == companyId, cancellationToken);
        return company is null
            ? ServiceResult<CompanyDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Company not found.")
            : ServiceResult<CompanyDetailsResponse>.Success(company.Adapt<CompanyDetailsResponse>());
    }
}