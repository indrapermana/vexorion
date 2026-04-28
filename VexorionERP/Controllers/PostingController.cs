using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/posting")]
[Authorize]
public class PostingController(
    IPostingService postingService) : ServiceResultControllerBase
{
    [HttpPost("sales-invoices/{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostSalesInvoice(Guid salesInvoiceId, [FromBody] PostSalesInvoiceRequest request)
    {
        var result = await postingService.PostSalesInvoiceAsync(
            salesInvoiceId,
            request.ReceivableAccountId,
            request.RevenueAccountId,
            request.TaxLiabilityAccountId,
            request.PostingDate,
            HttpContext.RequestAborted);

        if (!result.Succeeded)
            return ToPostingActionResult(result);

        return Ok(ToResponse(result.Value!));
    }

    [HttpPost("purchase-invoices/{purchaseInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostPurchaseInvoice(Guid purchaseInvoiceId, [FromBody] PostPurchaseInvoiceRequest request)
    {
        var result = await postingService.PostPurchaseInvoiceAsync(
            purchaseInvoiceId,
            request.PayableAccountId,
            request.ExpenseAccountId,
            request.TaxReceivableAccountId,
            request.PostingDate,
            HttpContext.RequestAborted);

        if (!result.Succeeded)
            return ToPostingActionResult(result);

        return Ok(ToResponse(result.Value!));
    }

    [HttpPost("customer-payments/{customerPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostCustomerPayment(Guid customerPaymentId, [FromBody] PostCustomerPaymentRequest request)
    {
        var result = await postingService.PostCustomerPaymentAsync(
            customerPaymentId,
            request.CashAccountId,
            request.ReceivableAccountId,
            request.PostingDate,
            HttpContext.RequestAborted);

        if (!result.Succeeded)
            return ToPostingActionResult(result);

        return Ok(ToResponse(result.Value!));
    }

    [HttpPost("vendor-payments/{vendorPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> PostVendorPayment(Guid vendorPaymentId, [FromBody] PostVendorPaymentRequest request)
    {
        var result = await postingService.PostVendorPaymentAsync(
            vendorPaymentId,
            request.PayableAccountId,
            request.CashAccountId,
            request.PostingDate,
            HttpContext.RequestAborted);

        if (!result.Succeeded)
            return ToPostingActionResult(result);

        return Ok(ToResponse(result.Value!));
    }

    [HttpPost("journals/{journalEntryId:guid}/reverse")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> ReverseJournal(Guid journalEntryId, [FromBody] ReverseJournalRequest request)
    {
        var result = await postingService.ReverseJournalAsync(journalEntryId, request.ReversalDate, HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToPostingActionResult(result);

        return Ok(ToResponse(result.Value!));
    }

    private static JournalEntryDetailsResponse ToResponse(JournalEntry journalEntry) => new()
    {
        Id = journalEntry.Id,
        JournalNumber = journalEntry.JournalNumber,
        SourceDocumentType = journalEntry.SourceDocumentType,
        SourceDocumentId = journalEntry.SourceDocumentId,
        PostingDate = journalEntry.PostingDate,
        FiscalPeriodId = journalEntry.FiscalPeriodId,
        Status = journalEntry.Status,
        TotalDebit = journalEntry.TotalDebit,
        TotalCredit = journalEntry.TotalCredit,
        ReversedJournalEntryId = journalEntry.ReversedJournalEntryId,
        Description = journalEntry.Description,
        Lines = journalEntry.Lines
            .OrderBy(x => x.LineNumber)
            .Select(x => new JournalEntryLineResponse
            {
                Id = x.Id,
                AccountId = x.AccountId,
                AccountCode = x.Account?.Code ?? string.Empty,
                AccountName = x.Account?.Name ?? string.Empty,
                LineNumber = x.LineNumber,
                Description = x.Description,
                DebitAmount = x.DebitAmount,
                CreditAmount = x.CreditAmount,
            })
            .ToList(),
    };

    private ActionResult<JournalEntryDetailsResponse> ToPostingActionResult(ServiceResult<JournalEntry> result)
    {
        if (result.Validation is not null)
            return BadRequest(result.Validation);

        return result.StatusCode switch
        {
            400 => BadRequest(new { message = result.ErrorMessage }),
            401 => Unauthorized(),
            403 => Forbid(),
            404 => NotFound(),
            409 => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }
}
