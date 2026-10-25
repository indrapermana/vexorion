using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/posting")]
[Authorize]
public class PostingController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpPost("journals")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> CreateManualJournal([FromBody] CreateManualJournalRequest request)
    {
        var result = await mediator.Send(new CreateManualJournalCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("journals/{journalEntryId:guid}/post")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostManualJournal(Guid journalEntryId)
    {
        var result = await mediator.Send(new PostManualJournalCommand(journalEntryId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("sales-invoices/{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostSalesInvoice(Guid salesInvoiceId, [FromBody] PostSalesInvoiceRequest request)
    {
        var result = await mediator.Send(new PostSalesInvoiceCommand(salesInvoiceId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("purchase-invoices/{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostPurchaseInvoice(Guid purchaseInvoiceId, [FromBody] PostPurchaseInvoiceRequest request)
    {
        var result = await mediator.Send(new PostPurchaseInvoiceCommand(purchaseInvoiceId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("customer-payments/{customerPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostCustomerPayment(Guid customerPaymentId, [FromBody] PostCustomerPaymentRequest request)
    {
        var result = await mediator.Send(new PostCustomerPaymentCommand(customerPaymentId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("vendor-payments/{vendorPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostVendorPayment(Guid vendorPaymentId, [FromBody] PostVendorPaymentRequest request)
    {
        var result = await mediator.Send(new PostVendorPaymentCommand(vendorPaymentId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("journals/{journalEntryId:guid}/reverse")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> ReverseJournal(Guid journalEntryId, [FromBody] ReverseJournalRequest request)
    {
        var result = await mediator.Send(new ReverseJournalCommand(journalEntryId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
