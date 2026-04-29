using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/sales-orders/{salesOrderId:guid}/lines")]
[Authorize]
public class SalesOrderLinesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>> GetAll(Guid salesOrderId)
    {
        var result = await mediator.Send(new GetSalesOrderLinesQuery(salesOrderId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> GetById(Guid salesOrderId, Guid salesOrderLineId)
    {
        var result = await mediator.Send(new GetSalesOrderLineByIdQuery(salesOrderId, salesOrderLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> Create(Guid salesOrderId, [FromBody] CreateSalesOrderLineRequest request)
    {
        var result = await mediator.Send(new CreateSalesOrderLineCommand(salesOrderId, request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesOrderId, salesOrderLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesOrderLineDetailsResponse>> Update(Guid salesOrderId, Guid salesOrderLineId, [FromBody] UpdateSalesOrderLineRequest request)
    {
        var result = await mediator.Send(new UpdateSalesOrderLineCommand(salesOrderId, salesOrderLineId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesOrderLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesOrderId, Guid salesOrderLineId)
    {
        var result = await mediator.Send(new DeleteSalesOrderLineCommand(salesOrderId, salesOrderLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
