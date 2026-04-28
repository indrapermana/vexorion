using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController(
    ICommandService<PurchaseOrder> purchaseOrderCommandService,
    IQueryService<PurchaseOrder> purchaseOrderQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>> GetAll()
    {
        var result = await purchaseOrderQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> GetById(Guid purchaseOrderId)
    {
        var result = await purchaseOrderQueryService.GetByIdAsync(purchaseOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> Create([FromBody] CreatePurchaseOrderRequest request)
    {
        var result = await purchaseOrderCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<PurchaseOrderDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { purchaseOrderId = mapped.Id }, mapped);
    }

    [HttpPut("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseOrderDetailsResponse>> Update(Guid purchaseOrderId, [FromBody] UpdatePurchaseOrderRequest request)
    {
        var result = await purchaseOrderCommandService.UpdateAsync(purchaseOrderId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{purchaseOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseOrderId)
    {
        var result = await purchaseOrderCommandService.DeleteAsync(purchaseOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<PurchaseOrderDetailsResponse> MapResult(ServiceResult<IEntityResponse<PurchaseOrder>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseOrderDetailsResponse>();
            return ServiceResult<PurchaseOrderDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseOrderDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseOrder>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<PurchaseOrderListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
