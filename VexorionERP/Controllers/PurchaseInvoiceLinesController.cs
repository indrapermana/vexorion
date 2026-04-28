using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/purchase-invoices/{purchaseInvoiceId:guid}/lines")]
[Authorize]
public class PurchaseInvoiceLinesController(
    ILineCommandService<PurchaseInvoice, PurchaseInvoiceLine> purchaseInvoiceLineCommandService,
    ILineQueryService<PurchaseInvoice, PurchaseInvoiceLine> purchaseInvoiceLineQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>> GetAll(Guid purchaseInvoiceId)
    {
        var result = await purchaseInvoiceLineQueryService.GetAllForParentAsync(purchaseInvoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{purchaseInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<PurchaseInvoiceLineDetailsResponse>> GetById(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId)
    {
        var result = await purchaseInvoiceLineQueryService.GetByIdAsync(purchaseInvoiceId, purchaseInvoiceLineId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceLineDetailsResponse>> Create(Guid purchaseInvoiceId, [FromBody] CreatePurchaseInvoiceLineRequest request)
    {
        var result = await purchaseInvoiceLineCommandService.CreateAsync(purchaseInvoiceId, request, HttpContext.RequestAborted);
        var mappedResult = MapResult(result);
        if (!mappedResult.Succeeded) return ToActionResult(mappedResult);
        return CreatedAtAction(nameof(GetById), new { purchaseInvoiceId, purchaseInvoiceLineId = mappedResult.Value!.Id }, mappedResult.Value);
    }

    [HttpPut("{purchaseInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<PurchaseInvoiceLineDetailsResponse>> Update(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, [FromBody] UpdatePurchaseInvoiceLineRequest request)
    {
        var result = await purchaseInvoiceLineCommandService.UpdateAsync(purchaseInvoiceId, purchaseInvoiceLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{purchaseInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult> Delete(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId)
    {
        var result = await purchaseInvoiceLineCommandService.DeleteAsync(purchaseInvoiceId, purchaseInvoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<PurchaseInvoiceLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<PurchaseInvoiceLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseInvoiceLineDetailsResponse>();
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseInvoiceLine>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
