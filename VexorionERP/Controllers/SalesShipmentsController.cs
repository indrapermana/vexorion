using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-shipments")]
[Authorize]
public class SalesShipmentsController(
    ICommandService<SalesShipment> salesShipmentCommandService,
    ISalesShipmentPostingService salesShipmentPostingService,
    IChildQueryService<SalesOrder, SalesShipment> salesShipmentQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet("by-order/{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesShipmentListItemResponse>>> GetAllForOrder(Guid salesOrderId)
    {
        var result = await salesShipmentQueryService.GetAllForParentAsync(salesOrderId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{shipmentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesShipmentDetailsResponse>> GetById(Guid shipmentId)
    {
        var result = await salesShipmentQueryService.GetByIdAsync(shipmentId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesShipmentDetailsResponse>> Create([FromBody] CreateSalesShipmentRequest request)
    {
        var result = await salesShipmentCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<SalesShipmentDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { shipmentId = mapped.Id }, mapped);
    }

    [HttpPost("{shipmentId:guid}/post")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesShipmentDetailsResponse>> Post(Guid shipmentId)
    {
        var result = await salesShipmentPostingService.PostAsync(shipmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{shipmentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<IActionResult> Delete(Guid shipmentId)
    {
        var result = await salesShipmentCommandService.DeleteAsync(shipmentId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<SalesShipmentDetailsResponse> MapResult(ServiceResult<IEntityResponse<SalesShipment>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesShipmentDetailsResponse>();
            return ServiceResult<SalesShipmentDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesShipmentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesShipment>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<SalesShipmentListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

}
