using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize]
public class PurchaseInvoicesController(
    IPurchaseInvoiceCommandService purchaseInvoiceCommandService,
    IPurchaseInvoiceQueryService purchaseInvoiceQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAll()
    {
        var result = await purchaseInvoiceQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> GetById(Guid purchaseInvoiceId)
    {
        var result = await purchaseInvoiceQueryService.GetByIdAsync(purchaseInvoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Create([FromBody] CreatePurchaseInvoiceRequest request)
    {
        var result = await purchaseInvoiceCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { purchaseInvoiceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Update(Guid purchaseInvoiceId, [FromBody] UpdatePurchaseInvoiceRequest request)
    {
        var result = await purchaseInvoiceCommandService.UpdateAsync(purchaseInvoiceId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseInvoiceId)
    {
        var result = await purchaseInvoiceCommandService.DeleteAsync(purchaseInvoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
