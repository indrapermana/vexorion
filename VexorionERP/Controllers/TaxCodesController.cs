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
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<IReadOnlyCollection<TaxCodeListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetTaxCodesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> GetById(Guid taxCodeId)
    {
        var result = await mediator.Send(new GetTaxCodeByIdQuery(taxCodeId), HttpContext.RequestAborted);
        return ToActionResult(result);
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

        return CreatedAtAction(nameof(GetById), new { taxCodeId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult<TaxCodeDetailsResponse>> Update(Guid taxCodeId, [FromBody] UpdateTaxCodeRequest request)
    {
        var result = await mediator.Send(new UpdateTaxCodeCommand(taxCodeId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{taxCodeId:guid}")]
    [Authorize(Policy = AppPermissions.Accounting.Manage)]
    public async Task<ActionResult> Delete(Guid taxCodeId)
    {
        var result = await mediator.Send(new DeleteTaxCodeCommand(taxCodeId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
