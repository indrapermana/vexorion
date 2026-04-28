using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/invoices/{invoiceId:guid}/lines")]
[Authorize]
public class InvoiceLinesController(
    ILineCommandService<Invoice, InvoiceLine> invoiceLineCommandService,
    ILineQueryService<Invoice, InvoiceLine> invoiceLineQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceLineListItemResponse>>> GetAll(Guid invoiceId)
    {
        var result = await invoiceLineQueryService.GetAllForParentAsync(invoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{invoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<InvoiceLineDetailsResponse>> GetById(Guid invoiceId, Guid invoiceLineId)
    {
        var result = await invoiceLineQueryService.GetByIdAsync(invoiceId, invoiceLineId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceLineDetailsResponse>> Create(Guid invoiceId, [FromBody] CreateInvoiceLineRequest request)
    {
        var result = await invoiceLineCommandService.CreateAsync(invoiceId, request, HttpContext.RequestAborted);
        var mappedResult = MapResult(result);
        if (!mappedResult.Succeeded) return ToActionResult(mappedResult);
        return CreatedAtAction(nameof(GetById), new { invoiceId, invoiceLineId = mappedResult.Value!.Id }, mappedResult.Value);
    }

    [HttpPut("{invoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceLineDetailsResponse>> Update(Guid invoiceId, Guid invoiceLineId, [FromBody] UpdateInvoiceLineRequest request)
    {
        var result = await invoiceLineCommandService.UpdateAsync(invoiceId, invoiceLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{invoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult> Delete(Guid invoiceId, Guid invoiceLineId)
    {
        var result = await invoiceLineCommandService.DeleteAsync(invoiceId, invoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<InvoiceLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<InvoiceLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<InvoiceLineDetailsResponse>();
            return ServiceResult<InvoiceLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<InvoiceLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<InvoiceLine>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<InvoiceLineListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
