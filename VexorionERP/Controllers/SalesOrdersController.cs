using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Sales.Orders;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/sales-orders")]
[Authorize]
public class SalesOrdersController(
    ISalesOrderCommandService salesOrderCommandService,
    ISalesOrderQueryService salesOrderQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderListItemResponse>>> GetAll()
    {
        var result = await salesOrderQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> GetById(Guid salesOrderId)
    {
        var result = await salesOrderQueryService.GetByIdAsync(salesOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> Create([FromBody] CreateSalesOrderRequest request)
    {
        var result = await salesOrderCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesOrderId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> Update(Guid salesOrderId, [FromBody] UpdateSalesOrderRequest request)
    {
        var result = await salesOrderCommandService.UpdateAsync(salesOrderId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesOrderId)
    {
        var result = await salesOrderCommandService.DeleteAsync(salesOrderId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}