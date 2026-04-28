using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize]
public class PurchaseInvoicesController(
    ICommandService<PurchaseInvoice> purchaseInvoiceCommandService,
    IPurchaseInvoiceQueryService purchaseInvoiceQueryService,
    AppDbContext dbContext,
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
        var result = await purchaseInvoiceCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<PurchaseInvoiceDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { purchaseInvoiceId = mapped.Id }, mapped);
    }

    [HttpPut("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> Update(Guid purchaseInvoiceId, [FromBody] UpdatePurchaseInvoiceRequest request)
    {
        var result = await purchaseInvoiceCommandService.UpdateAsync(purchaseInvoiceId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseInvoiceId)
    {
        var result = await purchaseInvoiceCommandService.DeleteAsync(purchaseInvoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<PurchaseInvoiceDetailsResponse> MapResult(ServiceResult<IEntityResponse<PurchaseInvoice>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseInvoiceDetailsResponse>();
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
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
