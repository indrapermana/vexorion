using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/tax-codes")]
[Authorize]
public class TaxCodesController(
    IMediator mediator,
    ITenantMemoryCache tenantMemoryCache) : ServiceResultControllerBase
{
    private const string CacheArea = "tax-codes";

    [HttpGet]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<IReadOnlyCollection<TaxCodeListItemResponse>>> GetAll()
    {
        if (tenantMemoryCache.TryGetValue<IReadOnlyCollection<TaxCodeListItemResponse>>(CacheArea, "all", out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetTaxCodesQuery(), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, "all", result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpGet("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> GetById(Guid taxCodeId)
    {
        var detailsKey = $"details:{taxCodeId}";
        if (tenantMemoryCache.TryGetValue<TaxCodeDetailsResponse>(CacheArea, detailsKey, out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetTaxCodeByIdQuery(taxCodeId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, detailsKey, result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> Create([FromBody] CreateTaxCodeRequest request)
    {
        var result = await mediator.Send(new CreateTaxCodeCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "all");

        return CreatedAtAction(nameof(GetById), new { taxCodeId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> Update(Guid taxCodeId, [FromBody] UpdateTaxCodeRequest request)
    {
        var result = await mediator.Send(new UpdateTaxCodeCommand(taxCodeId, request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "all");
        tenantMemoryCache.Remove(CacheArea, $"details:{taxCodeId}");
        return Ok(result.Value);
    }

    [HttpDelete("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult> Delete(Guid taxCodeId)
    {
        var result = await mediator.Send(new DeleteTaxCodeCommand(taxCodeId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "all");
        tenantMemoryCache.Remove(CacheArea, $"details:{taxCodeId}");
        return NoContent();
    }
}
