using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-receipts")]
[Authorize]
public class PurchaseReceiptsController(
    ICommandService<PurchaseReceipt> purchaseReceiptCommandService,
    IPurchaseReceiptPostingService purchaseReceiptPostingService,
    IChildQueryService<PurchaseOrder, PurchaseReceipt> purchaseReceiptQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet("by-order/{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>>> GetAllForOrder(Guid purchaseOrderId)
    {
        var result = await purchaseReceiptQueryService.GetAllForParentAsync(purchaseOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{receiptId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> GetById(Guid receiptId)
    {
        var result = await purchaseReceiptQueryService.GetByIdAsync(receiptId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> Create([FromBody] CreatePurchaseReceiptRequest request)
    {
        var result = await purchaseReceiptCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<PurchaseReceiptDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { receiptId = mapped.Id }, mapped);
    }

    [HttpPost("{receiptId:guid}/post")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseReceiptDetailsResponse>> Post(Guid receiptId)
    {
        var result = await purchaseReceiptPostingService.PostAsync(receiptId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{receiptId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<IActionResult> Delete(Guid receiptId)
    {
        var result = await purchaseReceiptCommandService.DeleteAsync(receiptId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<PurchaseReceiptDetailsResponse> MapResult(ServiceResult<IEntityResponse<PurchaseReceipt>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseReceiptDetailsResponse>();
            return ServiceResult<PurchaseReceiptDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseReceipt>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<PurchaseReceiptListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

}
