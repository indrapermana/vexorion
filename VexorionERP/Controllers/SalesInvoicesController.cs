using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/sales-invoices")]
[Authorize]
public class SalesInvoicesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAll([FromQuery] bool outstandingOnly = false)
    {
        var result = await mediator.Send(new GetSalesInvoicesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> GetById(Guid salesInvoiceId)
    {
        var result = await mediator.Send(new GetSalesInvoiceByIdQuery(salesInvoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Create([FromBody] CreateSalesInvoiceRequest request)
    {
        var result = await mediator.Send(new CreateSalesInvoiceCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { salesInvoiceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Update(Guid salesInvoiceId, [FromBody] UpdateSalesInvoiceRequest request)
    {
        var result = await mediator.Send(new UpdateSalesInvoiceCommand(salesInvoiceId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesInvoiceId)
    {
        var result = await mediator.Send(new DeleteSalesInvoiceCommand(salesInvoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{salesInvoiceId:guid}/credit-note")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> CreateCreditNote(Guid salesInvoiceId, [FromBody] CreateCreditNoteRequest request)
    {
        var result = await mediator.Send(new CreateCreditNoteForSalesInvoiceCommand(salesInvoiceId, request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { salesInvoiceId = result.Value!.Id }, result.Value);
    }
}
