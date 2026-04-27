using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Finance.TaxCodes;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Identity;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/tax-codes")]
[Authorize]
public class TaxCodesController(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<IReadOnlyCollection<TaxCodeListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        var items = await dbContext.TaxCodes
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId.Value)
            .OrderBy(x => x.Code)
            .Select(x => new TaxCodeListItemResponse
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                RatePercent = x.RatePercent,
                IsInclusive = x.IsInclusive
            })
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> GetById(Guid taxCodeId, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        var taxCode = await dbContext.TaxCodes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == taxCodeId && x.TenantId == tenantId.Value, cancellationToken);

        if (taxCode is null)
        {
            return NotFound();
        }

        return Ok(new TaxCodeDetailsResponse
        {
            Id = taxCode.Id,
            TenantId = taxCode.TenantId,
            Code = taxCode.Code,
            Name = taxCode.Name,
            RatePercent = taxCode.RatePercent,
            IsInclusive = taxCode.IsInclusive
        });
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> Create([FromBody] CreateTaxCodeRequest request, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        var normalizedCode = request.Code.Trim();
        var normalizedName = request.Name.Trim();

        var duplicate = await dbContext.TaxCodes
            .AnyAsync(x => x.TenantId == tenantId.Value && x.Code == normalizedCode, cancellationToken);

        if (duplicate)
        {
            return BadRequest(new { message = "A tax code with the same code already exists." });
        }

        var taxCode = new TaxCode
        {
            TenantId = tenantId.Value,
            Code = normalizedCode,
            Name = normalizedName,
            RatePercent = request.RatePercent,
            IsInclusive = request.IsInclusive
        };

        dbContext.TaxCodes.Add(taxCode);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new TaxCodeDetailsResponse
        {
            Id = taxCode.Id,
            TenantId = taxCode.TenantId,
            Code = taxCode.Code,
            Name = taxCode.Name,
            RatePercent = taxCode.RatePercent,
            IsInclusive = taxCode.IsInclusive
        };

        return CreatedAtAction(nameof(GetById), new { taxCodeId = taxCode.Id }, response);
    }

    [HttpPut("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> Update(Guid taxCodeId, [FromBody] UpdateTaxCodeRequest request, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        var taxCode = await dbContext.TaxCodes
            .FirstOrDefaultAsync(x => x.Id == taxCodeId && x.TenantId == tenantId.Value, cancellationToken);

        if (taxCode is null)
        {
            return NotFound();
        }

        var normalizedCode = request.Code.Trim();
        var normalizedName = request.Name.Trim();

        var duplicate = await dbContext.TaxCodes
            .AnyAsync(x => x.TenantId == tenantId.Value && x.Code == normalizedCode && x.Id != taxCodeId, cancellationToken);

        if (duplicate)
        {
            return BadRequest(new { message = "A tax code with the same code already exists." });
        }

        taxCode.Code = normalizedCode;
        taxCode.Name = normalizedName;
        taxCode.RatePercent = request.RatePercent;
        taxCode.IsInclusive = request.IsInclusive;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new TaxCodeDetailsResponse
        {
            Id = taxCode.Id,
            TenantId = taxCode.TenantId,
            Code = taxCode.Code,
            Name = taxCode.Name,
            RatePercent = taxCode.RatePercent,
            IsInclusive = taxCode.IsInclusive
        });
    }

    [HttpDelete("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult> Delete(Guid taxCodeId, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        var taxCode = await dbContext.TaxCodes
            .FirstOrDefaultAsync(x => x.Id == taxCodeId && x.TenantId == tenantId.Value, cancellationToken);

        if (taxCode is null)
        {
            return NotFound();
        }

        dbContext.TaxCodes.Remove(taxCode);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
