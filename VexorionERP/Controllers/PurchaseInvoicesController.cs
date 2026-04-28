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
    IFilteredQueryService<PurchaseInvoice, bool> purchaseInvoiceQueryService,
    AppDbContext dbContext,
    IInvoiceApprovalService invoiceApprovalService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAll([FromQuery] bool outstandingOnly = false)
    {
        var result = await purchaseInvoiceQueryService.GetAllAsync(outstandingOnly, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseInvoiceDetailsResponse>> GetById(Guid purchaseInvoiceId)
    {
        var result = await purchaseInvoiceQueryService.GetByIdAsync(purchaseInvoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
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

    private ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseInvoice>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.Failure(
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
