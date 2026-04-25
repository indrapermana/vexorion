using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Purchasing.Lines;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/purchase-orders/{purchaseOrderId:guid}/lines")]
[Authorize]
public class PurchaseOrderLinesController(
    IPurchaseOrderLineCommandService purchaseOrderLineCommandService,
    IPurchaseOrderLineQueryService purchaseOrderLineQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>> GetAll(Guid purchaseOrderId)
    {
        var result = await purchaseOrderLineQueryService.GetAllAsync(purchaseOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{purchaseOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseOrderLineDetailsResponse>> GetById(Guid purchaseOrderId, Guid purchaseOrderLineId)
    {
        var result = await purchaseOrderLineQueryService.GetByIdAsync(purchaseOrderId, purchaseOrderLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderLineDetailsResponse>> Create(Guid purchaseOrderId, [FromBody] CreatePurchaseOrderLineRequest request)
    {
        var result = await purchaseOrderLineCommandService.CreateAsync(purchaseOrderId, request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { purchaseOrderId, purchaseOrderLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{purchaseOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderLineDetailsResponse>> Update(Guid purchaseOrderId, Guid purchaseOrderLineId, [FromBody] UpdatePurchaseOrderLineRequest request)
    {
        var result = await purchaseOrderLineCommandService.UpdateAsync(purchaseOrderId, purchaseOrderLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{purchaseOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseOrderId, Guid purchaseOrderLineId)
    {
        var result = await purchaseOrderLineCommandService.DeleteAsync(purchaseOrderId, purchaseOrderLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}