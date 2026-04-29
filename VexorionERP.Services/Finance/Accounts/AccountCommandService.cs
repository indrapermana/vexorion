using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class AccountCommandService(ICurrentTenantProvider currentTenantProvider)
    : BaseCommandService<Account>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Account> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        if (input is not CreateAccountRequest request)
        {
            errorMessage = "Invalid account create request.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            errorMessage = "Code and name are required.";
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Account>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Account> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        if (input is not CreateAccountRequest request)
        {
            return ServiceResult<IEntityResponse<Account>>.Failure(StatusCodes.Status400BadRequest, "Invalid account create request.");
        }

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null;
        }

        var code = request.Code.Trim().ToUpperInvariant();
        var exists = await context.Accounts.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Code.ToUpper() == code, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Account>>.Failure(
                StatusCodes.Status409Conflict,
                "An account with the same code already exists.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Account> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        if (input is not UpdateAccountRequest request)
        {
            errorMessage = "Invalid account update request.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            errorMessage = "Code and name are required.";
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Account>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Account> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        if (input is not UpdateAccountRequest request)
        {
            return ServiceResult<IEntityResponse<Account>>.Failure(StatusCodes.Status400BadRequest, "Invalid account update request.");
        }

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null;
        }

        var code = request.Code.Trim().ToUpperInvariant();
        var exists = await context.Accounts.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.Code.ToUpper() == code, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Account>>.Failure(
                StatusCodes.Status409Conflict,
                "An account with the same code already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<bool>?> ValidateDeleteBusinessRulesAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null;
        }

        var hasLines = await context.JournalEntryLines
            .AnyAsync(x => x.TenantId == tenantId.Value && x.AccountId == id, cancellationToken);
        if (hasLines)
        {
            return ServiceResult<bool>.Failure(
                StatusCodes.Status400BadRequest,
                "Account cannot be deleted because it is referenced by journal entries.");
        }

        return null;
    }

    public override Task<Account> GetAddToDbObjectAsync(
        ICreateInput<Account> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (input is not CreateAccountRequest request)
        {
            return Task.FromResult<Account>(null!);
        }

        return Task.FromResult(new Account
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            AccountType = request.AccountType,
            NormalBalance = request.NormalBalance,
            IsPostingAllowed = request.IsPostingAllowed,
            IsActive = request.IsActive,
            Description = NormalizeOptional(request.Description),
        });
    }

    protected override async Task<Account> GetUpdatedDbObjectAsync(
        Guid accountId,
        IUpdateInput<Account> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (input is not UpdateAccountRequest request)
        {
            return null!;
        }

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null!;
        }

        var account = await context.Accounts.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId.Value && x.Id == accountId, cancellationToken);

        if (account is null)
        {
            return null!;
        }

        account.Code = request.Code.Trim().ToUpperInvariant();
        account.Name = request.Name.Trim();
        account.AccountType = request.AccountType;
        account.NormalBalance = request.NormalBalance;
        account.IsPostingAllowed = request.IsPostingAllowed;
        account.IsActive = request.IsActive;
        account.Description = NormalizeOptional(request.Description);

        return account;
    }

    protected override async Task<Account> GetDeleteObjectAsync(
        Guid accountId,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null!;
        }

        var account = await context.Accounts.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId.Value && x.Id == accountId, cancellationToken);

        return account ?? null!;
    }

    protected override IEntityResponse<Account> BuildEntityResponse(Account entity) => ToDetails(entity);

    protected override string GetNotFoundMessage() => "Account not found.";

    private static AccountDetailsResponse ToDetails(Account account) => new()
    {
        Id = account.Id,
        Code = account.Code,
        Name = account.Name,
        AccountType = account.AccountType,
        NormalBalance = account.NormalBalance,
        IsPostingAllowed = account.IsPostingAllowed,
        IsActive = account.IsActive,
        Description = account.Description,
    };

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
