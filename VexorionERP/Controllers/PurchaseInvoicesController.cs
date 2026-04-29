using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize]
public class PurchaseInvoicesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAll([FromQuery] bool outstandingOnly = false)
    {
        var result = await mediator.Send(new GetPurchaseInvoicesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> GetById(Guid purchaseInvoiceId)
    {
        var result = await mediator.Send(new GetPurchaseInvoiceByIdQuery(purchaseInvoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Create([FromBody] CreatePurchaseInvoiceRequest request)
    {
        var result = await mediator.Send(new CreatePurchaseInvoiceCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { purchaseInvoiceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Update(Guid purchaseInvoiceId, [FromBody] UpdatePurchaseInvoiceRequest request)
    {
        var result = await mediator.Send(new UpdatePurchaseInvoiceCommand(purchaseInvoiceId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseInvoiceId)
    {
        var result = await mediator.Send(new DeletePurchaseInvoiceCommand(purchaseInvoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
