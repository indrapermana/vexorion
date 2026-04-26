using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Finance.Accounts;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Identity;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/accounts")]
[Authorize]
public class AccountsController(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<AccountListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var accounts = await dbContext.Accounts
            .Where(x => x.TenantId == tenantId)
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
            .ToListAsync(cancellationToken);

        return Ok(accounts);
    }

    [HttpGet("{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<AccountDetailsResponse>> GetById(Guid accountId, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var account = await dbContext.Accounts
            .Where(x => x.TenantId == tenantId && x.Id == accountId)
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

        if (account is null)
            return NotFound();

        return Ok(account);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<AccountDetailsResponse>> Create([FromBody] CreateAccountRequest request, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Code and name are required." });

        var code = request.Code.Trim().ToUpperInvariant();
        if (await dbContext.Accounts.AnyAsync(x => x.TenantId == tenantId && x.Code.ToUpper() == code, cancellationToken))
            return Conflict(new { message = "An account with the same code already exists." });

        var account = new Account
        {
            TenantId = tenantId,
            Code = code,
            Name = request.Name.Trim(),
            AccountType = request.AccountType,
            NormalBalance = request.NormalBalance,
            IsPostingAllowed = request.IsPostingAllowed,
            IsActive = request.IsActive,
            Description = NormalizeOptional(request.Description),
        };

        dbContext.Accounts.Add(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { accountId = account.Id }, ToDetails(account));
    }

    [HttpPut("{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<AccountDetailsResponse>> Update(Guid accountId, [FromBody] UpdateAccountRequest request, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == accountId, cancellationToken);
        if (account is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Code and name are required." });

        var code = request.Code.Trim().ToUpperInvariant();
        if (await dbContext.Accounts.AnyAsync(x => x.TenantId == tenantId && x.Id != accountId && x.Code.ToUpper() == code, cancellationToken))
            return Conflict(new { message = "An account with the same code already exists." });

        account.Code = code;
        account.Name = request.Name.Trim();
        account.AccountType = request.AccountType;
        account.NormalBalance = request.NormalBalance;
        account.IsPostingAllowed = request.IsPostingAllowed;
        account.IsActive = request.IsActive;
        account.Description = NormalizeOptional(request.Description);
        account.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDetails(account));
    }

    [HttpDelete("{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult> Delete(Guid accountId, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == accountId, cancellationToken);
        if (account is null)
            return NotFound();

        var hasLines = await dbContext.JournalEntryLines.AnyAsync(x => x.TenantId == tenantId && x.AccountId == accountId, cancellationToken);
        if (hasLines)
            return BadRequest(new { message = "Account cannot be deleted because it is referenced by journal entries." });

        dbContext.Accounts.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

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

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
