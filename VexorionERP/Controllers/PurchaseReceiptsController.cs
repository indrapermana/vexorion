using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-receipts")]
[Authorize]
public class PurchaseReceiptsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet("by-order/{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>>> GetAllForOrder(Guid purchaseOrderId)
    {
        var result = await mediator.Send(new GetPurchaseReceiptsForOrderQuery(purchaseOrderId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{receiptId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> GetById(Guid receiptId)
    {
        var result = await mediator.Send(new GetPurchaseReceiptByIdQuery(receiptId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> Create([FromBody] CreatePurchaseReceiptRequest request)
    {
        var result = await mediator.Send(new CreatePurchaseReceiptCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { receiptId = result.Value!.Id }, result.Value);
    }

    [HttpPost("{receiptId:guid}/post")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> Post(Guid receiptId)
    {
        var result = await mediator.Send(new PostPurchaseReceiptCommand(receiptId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{receiptId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<IActionResult> Delete(Guid receiptId)
    {
        var result = await mediator.Send(new DeletePurchaseReceiptCommand(receiptId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
