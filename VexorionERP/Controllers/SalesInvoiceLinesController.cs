using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/sales-invoices/{salesInvoiceId:guid}/lines")]
[Authorize]
public class SalesInvoiceLinesController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>> GetAll(Guid salesInvoiceId)
    {
        var result = await mediator.Send(new GetSalesInvoiceLinesQuery(salesInvoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> GetById(Guid salesInvoiceId, Guid salesInvoiceLineId)
    {
        var result = await mediator.Send(new GetSalesInvoiceLineByIdQuery(salesInvoiceId, salesInvoiceLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> Create(Guid salesInvoiceId, [FromBody] CreateSalesInvoiceLineRequest request)
    {
        var result = await mediator.Send(new CreateSalesInvoiceLineCommand(salesInvoiceId, request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesInvoiceId, salesInvoiceLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> Update(Guid salesInvoiceId, Guid salesInvoiceLineId, [FromBody] UpdateSalesInvoiceLineRequest request)
    {
        var result = await mediator.Send(new UpdateSalesInvoiceLineCommand(salesInvoiceId, salesInvoiceLineId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesInvoiceId, Guid salesInvoiceLineId)
    {
        var result = await mediator.Send(new DeleteSalesInvoiceLineCommand(salesInvoiceId, salesInvoiceLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
