using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-orders/{purchaseOrderId:guid}/lines")]
[Authorize]
public class PurchaseOrderLinesController(
    ILineCommandService<PurchaseOrder, PurchaseOrderLine> purchaseOrderLineCommandService,
    ILineQueryService<PurchaseOrder, PurchaseOrderLine> purchaseOrderLineQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>> GetAll(Guid purchaseOrderId)
    {
        var result = await purchaseOrderLineQueryService.GetAllForParentAsync(purchaseOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{purchaseOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseOrderLineDetailsResponse>> GetById(Guid purchaseOrderId, Guid purchaseOrderLineId)
    {
        var result = await purchaseOrderLineQueryService.GetByIdAsync(purchaseOrderId, purchaseOrderLineId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderLineDetailsResponse>> Create(Guid purchaseOrderId, [FromBody] CreatePurchaseOrderLineRequest request)
    {
        var result = await purchaseOrderLineCommandService.CreateAsync(purchaseOrderId, request, HttpContext.RequestAborted);
        var mappedResult = MapResult(result);
        if (!mappedResult.Succeeded) return ToActionResult(mappedResult);
        return CreatedAtAction(nameof(GetById), new { purchaseOrderId, purchaseOrderLineId = mappedResult.Value!.Id }, mappedResult.Value);
    }

    [HttpPut("{purchaseOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderLineDetailsResponse>> Update(Guid purchaseOrderId, Guid purchaseOrderLineId, [FromBody] UpdatePurchaseOrderLineRequest request)
    {
        var result = await purchaseOrderLineCommandService.UpdateAsync(purchaseOrderId, purchaseOrderLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{purchaseOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseOrderId, Guid purchaseOrderLineId)
    {
        var result = await purchaseOrderLineCommandService.DeleteAsync(purchaseOrderId, purchaseOrderLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<PurchaseOrderLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<PurchaseOrderLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseOrderLineDetailsResponse>();
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseOrderLine>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
