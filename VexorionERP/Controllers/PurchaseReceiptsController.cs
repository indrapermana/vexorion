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
    IPurchaseReceiptQueryService purchaseReceiptQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
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
}
