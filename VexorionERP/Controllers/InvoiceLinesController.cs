using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/invoices/{invoiceId:guid}/lines")]
[Authorize]
public class InvoiceLinesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceLineListItemResponse>>> GetAll(Guid invoiceId)
    {
        var result = await mediator.Send(new GetInvoiceLinesQuery(invoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{invoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<InvoiceLineDetailsResponse>> GetById(Guid invoiceId, Guid invoiceLineId)
    {
        var result = await mediator.Send(new GetInvoiceLineByIdQuery(invoiceId, invoiceLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceLineDetailsResponse>> Create(Guid invoiceId, [FromBody] CreateInvoiceLineRequest request)
    {
        var result = await mediator.Send(new CreateInvoiceLineCommand(invoiceId, request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { invoiceId, invoiceLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{invoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceLineDetailsResponse>> Update(Guid invoiceId, Guid invoiceLineId, [FromBody] UpdateInvoiceLineRequest request)
    {
        var result = await mediator.Send(new UpdateInvoiceLineCommand(invoiceId, invoiceLineId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{invoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult> Delete(Guid invoiceId, Guid invoiceLineId)
    {
        var result = await mediator.Send(new DeleteInvoiceLineCommand(invoiceId, invoiceLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
