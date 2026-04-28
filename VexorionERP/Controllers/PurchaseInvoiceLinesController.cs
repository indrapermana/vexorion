using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-invoices/{purchaseInvoiceId:guid}/lines")]
[Authorize]
public class PurchaseInvoiceLinesController(
    IPurchaseInvoiceLineCommandService purchaseInvoiceLineCommandService,
    IPurchaseInvoiceLineQueryService purchaseInvoiceLineQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>> GetAll(Guid purchaseInvoiceId)
    {
        var result = await purchaseInvoiceLineQueryService.GetAllAsync(purchaseInvoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{purchaseInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseInvoiceLineDetailsResponse>> GetById(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId)
    {
        var result = await purchaseInvoiceLineQueryService.GetByIdAsync(purchaseInvoiceId, purchaseInvoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceLineDetailsResponse>> Create(Guid purchaseInvoiceId, [FromBody] CreatePurchaseInvoiceLineRequest request)
    {
        var result = await purchaseInvoiceLineCommandService.CreateAsync(purchaseInvoiceId, request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { purchaseInvoiceId, purchaseInvoiceLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{purchaseInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceLineDetailsResponse>> Update(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, [FromBody] UpdatePurchaseInvoiceLineRequest request)
    {
        var result = await purchaseInvoiceLineCommandService.UpdateAsync(purchaseInvoiceId, purchaseInvoiceLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{purchaseInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId)
    {
        var result = await purchaseInvoiceLineCommandService.DeleteAsync(purchaseInvoiceId, purchaseInvoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
