using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize]
public class PurchaseInvoicesController(
    IPurchaseInvoiceCommandService purchaseInvoiceCommandService,
    IPurchaseInvoiceQueryService purchaseInvoiceQueryService,
    IInvoiceApprovalService invoiceApprovalService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAll([FromQuery] bool outstandingOnly = false)
    {
        var result = await purchaseInvoiceQueryService.GetAllAsync(outstandingOnly, HttpContext.RequestAborted);
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

    [HttpPost("{purchaseInvoiceId:guid}/approval/request")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> RequestApproval(Guid purchaseInvoiceId, [FromBody] ApprovalActionRequest request)
    {
        var result = await invoiceApprovalService.RequestPurchaseInvoiceApprovalAsync(
            purchaseInvoiceId,
            TryGetActorUserId(),
            request.Comment,
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{purchaseInvoiceId:guid}/approval/approve")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Approve(Guid purchaseInvoiceId, [FromBody] ApprovalActionRequest request)
    {
        var result = await invoiceApprovalService.ApprovePurchaseInvoiceAsync(
            purchaseInvoiceId,
            TryGetActorUserId(),
            request.Comment,
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{purchaseInvoiceId:guid}/approval/reject")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Reject(Guid purchaseInvoiceId, [FromBody] ApprovalActionRequest request)
    {
        var result = await invoiceApprovalService.RejectPurchaseInvoiceAsync(
            purchaseInvoiceId,
            TryGetActorUserId(),
            request.Comment,
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private Guid? TryGetActorUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
