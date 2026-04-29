using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/sales-orders")]
[Authorize]
public class SalesOrdersController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetSalesOrdersQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> GetById(Guid salesOrderId)
    {
        var result = await mediator.Send(new GetSalesOrderByIdQuery(salesOrderId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> Create([FromBody] CreateSalesOrderRequest request)
    {
        var result = await mediator.Send(new CreateSalesOrderCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesOrderId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderDetailsResponse>> Update(Guid salesOrderId, [FromBody] UpdateSalesOrderRequest request)
    {
        var result = await mediator.Send(new UpdateSalesOrderCommand(salesOrderId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesOrderId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesOrderId)
    {
        var result = await mediator.Send(new DeleteSalesOrderCommand(salesOrderId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
