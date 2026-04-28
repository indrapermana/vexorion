using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-receipts")]
[Authorize]
public class PurchaseReceiptsController(
    IPurchaseReceiptCommandService purchaseReceiptCommandService,
    IPurchaseReceiptQueryService purchaseReceiptQueryService) : ServiceResultControllerBase
{
    [HttpGet("by-order/{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<List<PurchaseReceiptListItemResponse>>> GetAllForOrder(Guid purchaseOrderId)
    {
        var result = await purchaseReceiptQueryService.GetAllForOrderAsync(purchaseOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{receiptId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> GetById(Guid receiptId)
    {
        var result = await purchaseReceiptQueryService.GetByIdAsync(receiptId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> Create([FromBody] CreatePurchaseReceiptRequest request)
    {
        var result = await purchaseReceiptCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { receiptId = result.Value!.Id }, result.Value);
    }

    [HttpPost("{receiptId:guid}/post")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> Post(Guid receiptId)
    {
        var result = await purchaseReceiptCommandService.PostAsync(receiptId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{receiptId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<IActionResult> Delete(Guid receiptId)
    {
        var result = await purchaseReceiptCommandService.DeleteAsync(receiptId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
