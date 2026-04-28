using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-orders/{salesOrderId:guid}/lines")]
[Authorize]
public class SalesOrderLinesController(
    ISalesOrderLineCommandService salesOrderLineCommandService,
    ISalesOrderLineQueryService salesOrderLineQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>> GetAll(Guid salesOrderId)
    {
        var result = await salesOrderLineQueryService.GetAllAsync(salesOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> GetById(Guid salesOrderId, Guid salesOrderLineId)
    {
        var result = await salesOrderLineQueryService.GetByIdAsync(salesOrderId, salesOrderLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> Create(Guid salesOrderId, [FromBody] CreateSalesOrderLineRequest request)
    {
        var result = await salesOrderLineCommandService.CreateAsync(salesOrderId, request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesOrderId, salesOrderLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> Update(Guid salesOrderId, Guid salesOrderLineId, [FromBody] UpdateSalesOrderLineRequest request)
    {
        var result = await salesOrderLineCommandService.UpdateAsync(salesOrderId, salesOrderLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesOrderId, Guid salesOrderLineId)
    {
        var result = await salesOrderLineCommandService.DeleteAsync(salesOrderId, salesOrderLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
