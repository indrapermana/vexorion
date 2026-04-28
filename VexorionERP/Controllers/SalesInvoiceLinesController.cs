using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-invoices/{salesInvoiceId:guid}/lines")]
[Authorize]
public class SalesInvoiceLinesController(
    ILineCommandService<SalesInvoice, SalesInvoiceLine> salesInvoiceLineCommandService,
    ILineQueryService<SalesInvoice, SalesInvoiceLine> salesInvoiceLineQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>> GetAll(Guid salesInvoiceId)
    {
        var result = await salesInvoiceLineQueryService.GetAllForParentAsync(salesInvoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> GetById(Guid salesInvoiceId, Guid salesInvoiceLineId)
    {
        var result = await salesInvoiceLineQueryService.GetByIdAsync(salesInvoiceId, salesInvoiceLineId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> Create(Guid salesInvoiceId, [FromBody] CreateSalesInvoiceLineRequest request)
    {
        var result = await salesInvoiceLineCommandService.CreateAsync(salesInvoiceId, request, HttpContext.RequestAborted);
        var mappedResult = MapResult(result);
        if (!mappedResult.Succeeded) return ToActionResult(mappedResult);
        return CreatedAtAction(nameof(GetById), new { salesInvoiceId, salesInvoiceLineId = mappedResult.Value!.Id }, mappedResult.Value);
    }

    [HttpPut("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> Update(Guid salesInvoiceId, Guid salesInvoiceLineId, [FromBody] UpdateSalesInvoiceLineRequest request)
    {
        var result = await salesInvoiceLineCommandService.UpdateAsync(salesInvoiceId, salesInvoiceLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesInvoiceId, Guid salesInvoiceLineId)
    {
        var result = await salesInvoiceLineCommandService.DeleteAsync(salesInvoiceId, salesInvoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<SalesInvoiceLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<SalesInvoiceLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesInvoiceLineDetailsResponse>();
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesInvoiceLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesInvoiceLine>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
