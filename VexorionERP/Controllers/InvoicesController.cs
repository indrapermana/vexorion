using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetInvoicesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<InvoiceDetailsResponse>> GetById(Guid invoiceId)
    {
        var result = await mediator.Send(new GetInvoiceByIdQuery(invoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceDetailsResponse>> Create([FromBody] CreateInvoiceRequest request)
    {
        var result = await mediator.Send(new CreateInvoiceCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { invoiceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceDetailsResponse>> Update(Guid invoiceId, [FromBody] UpdateInvoiceRequest request)
    {
        var result = await mediator.Send(new UpdateInvoiceCommand(invoiceId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult> Delete(Guid invoiceId)
    {
        var result = await mediator.Send(new DeleteInvoiceCommand(invoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
