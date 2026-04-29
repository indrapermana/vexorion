using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetPurchaseOrdersQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> GetById(Guid purchaseOrderId)
    {
        var result = await mediator.Send(new GetPurchaseOrderByIdQuery(purchaseOrderId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> Create([FromBody] CreatePurchaseOrderRequest request)
    {
        var result = await mediator.Send(new CreatePurchaseOrderCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { purchaseOrderId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> Update(Guid purchaseOrderId, [FromBody] UpdatePurchaseOrderRequest request)
    {
        var result = await mediator.Send(new UpdatePurchaseOrderCommand(purchaseOrderId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseOrderId)
    {
        var result = await mediator.Send(new DeletePurchaseOrderCommand(purchaseOrderId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
