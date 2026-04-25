using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Purchasing.Orders;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController(
    IPurchaseOrderCommandService purchaseOrderCommandService,
    IPurchaseOrderQueryService purchaseOrderQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>> GetAll()
    {
        var result = await purchaseOrderQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> GetById(Guid purchaseOrderId)
    {
        var result = await purchaseOrderQueryService.GetByIdAsync(purchaseOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> Create([FromBody] CreatePurchaseOrderRequest request)
    {
        var result = await purchaseOrderCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { purchaseOrderId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> Update(Guid purchaseOrderId, [FromBody] UpdatePurchaseOrderRequest request)
    {
        var result = await purchaseOrderCommandService.UpdateAsync(purchaseOrderId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseOrderId)
    {
        var result = await purchaseOrderCommandService.DeleteAsync(purchaseOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}