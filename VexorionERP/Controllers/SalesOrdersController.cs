using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-orders")]
[Authorize]
public class SalesOrdersController(
    ICommandService<SalesOrder> salesOrderCommandService,
    IQueryService<SalesOrder> salesOrderQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderListItemResponse>>> GetAll()
    {
        var result = await salesOrderQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> GetById(Guid salesOrderId)
    {
        var result = await salesOrderQueryService.GetByIdAsync(salesOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> Create([FromBody] CreateSalesOrderRequest request)
    {
        var result = await salesOrderCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<SalesOrderDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { salesOrderId = mapped.Id }, mapped);
    }

    [HttpPut("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> Update(Guid salesOrderId, [FromBody] UpdateSalesOrderRequest request)
    {
        var result = await salesOrderCommandService.UpdateAsync(salesOrderId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesOrderId)
    {
        var result = await salesOrderCommandService.DeleteAsync(salesOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<SalesOrderDetailsResponse> MapResult(ServiceResult<IEntityResponse<SalesOrder>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesOrderDetailsResponse>();
            return ServiceResult<SalesOrderDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesOrderDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesOrderDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesOrder>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<SalesOrderListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
