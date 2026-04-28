using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-orders/{salesOrderId:guid}/lines")]
[Authorize]
public class SalesOrderLinesController(
    ILineCommandService<SalesOrder, SalesOrderLine> salesOrderLineCommandService,
    ILineQueryService<SalesOrder, SalesOrderLine> salesOrderLineQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>> GetAll(Guid salesOrderId)
    {
        var result = await salesOrderLineQueryService.GetAllForParentAsync(salesOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> GetById(Guid salesOrderId, Guid salesOrderLineId)
    {
        var result = await salesOrderLineQueryService.GetByIdAsync(salesOrderId, salesOrderLineId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> Create(Guid salesOrderId, [FromBody] CreateSalesOrderLineRequest request)
    {
        var result = await salesOrderLineCommandService.CreateAsync(salesOrderId, request, HttpContext.RequestAborted);
        var mappedResult = MapResult(result);
        if (!mappedResult.Succeeded) return ToActionResult(mappedResult);
        return CreatedAtAction(nameof(GetById), new { salesOrderId, salesOrderLineId = mappedResult.Value!.Id }, mappedResult.Value);
    }

    [HttpPut("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> Update(Guid salesOrderId, Guid salesOrderLineId, [FromBody] UpdateSalesOrderLineRequest request)
    {
        var result = await salesOrderLineCommandService.UpdateAsync(salesOrderId, salesOrderLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesOrderId, Guid salesOrderLineId)
    {
        var result = await salesOrderLineCommandService.DeleteAsync(salesOrderId, salesOrderLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<SalesOrderLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<SalesOrderLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesOrderLineDetailsResponse>();
            return ServiceResult<SalesOrderLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesOrderLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesOrderLine>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<SalesOrderLineListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
