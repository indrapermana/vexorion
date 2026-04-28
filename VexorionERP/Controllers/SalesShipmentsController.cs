using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-shipments")]
[Authorize]
public class SalesShipmentsController(
    ISalesShipmentCommandService salesShipmentCommandService,
    ISalesShipmentQueryService salesShipmentQueryService) : ServiceResultControllerBase
{
    [HttpGet("by-order/{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<List<SalesShipmentListItemResponse>>> GetAllForOrder(Guid salesOrderId)
    {
        var result = await salesShipmentQueryService.GetAllForOrderAsync(salesOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{shipmentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesShipmentDetailsResponse>> GetById(Guid shipmentId)
    {
        var result = await salesShipmentQueryService.GetByIdAsync(shipmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesShipmentDetailsResponse>> Create([FromBody] CreateSalesShipmentRequest request)
    {
        var result = await salesShipmentCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { shipmentId = result.Value!.Id }, result.Value);
    }

    [HttpPost("{shipmentId:guid}/post")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesShipmentDetailsResponse>> Post(Guid shipmentId)
    {
        var result = await salesShipmentCommandService.PostAsync(shipmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{shipmentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<IActionResult> Delete(Guid shipmentId)
    {
        var result = await salesShipmentCommandService.DeleteAsync(shipmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
