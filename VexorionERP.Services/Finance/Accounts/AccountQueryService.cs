using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class AccountQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<Account>(currentTenantProvider)
{
    public override async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>>> GetAllAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var accounts = await context.Accounts
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId.Value)
            .OrderBy(x => x.Code)
            .Select(x => new AccountListItemResponse
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                AccountType = x.AccountType,
                NormalBalance = x.NormalBalance,
                IsPostingAllowed = x.IsPostingAllowed,
                IsActive = x.IsActive,
            })
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<Account>>>.Success(accounts);
    }

    public override async Task<ServiceResult<IEntityResponse<Account>>> GetByIdAsync(
        Guid accountId,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<Account>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var account = await context.Accounts
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId.Value && x.Id == accountId)
            .Select(x => new AccountDetailsResponse
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                AccountType = x.AccountType,
                NormalBalance = x.NormalBalance,
                IsPostingAllowed = x.IsPostingAllowed,
                IsActive = x.IsActive,
                Description = x.Description,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return account is null
            ? ServiceResult<IEntityResponse<Account>>.Failure(StatusCodes.Status404NotFound, "Account not found.")
            : ServiceResult<IEntityResponse<Account>>.Success(account);
    }
}
