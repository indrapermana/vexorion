using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PostingService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    INumberingService? numberingService = null) : IPostingService
{
    private readonly INumberingService _numberingService = numberingService ?? new NumberingService(dbContext, currentTenantProvider);

    public async Task<ServiceResult<JournalEntry>> PostSalesInvoiceAsync(
        Guid salesInvoiceId,
        Guid receivableAccountId,
        Guid revenueAccountId,
        Guid? taxLiabilityAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var invoice = await dbContext.SalesInvoices
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == tenantId, cancellationToken);

        if (invoice is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Sales invoice is not eligible for posting.");

        if (await HasDuplicatePostingAsync(tenantId, nameof(SalesInvoice), salesInvoiceId, cancellationToken))
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status409Conflict, "Sales invoice has already been posted.");

        var fiscalPeriod = await GetOpenFiscalPeriodAsync(tenantId, postingDate, cancellationToken);
        if (fiscalPeriod is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "No open fiscal period found for posting date.");

        var receivableAccountResult = await GetPostingAccountAsync(tenantId, receivableAccountId, cancellationToken);
        if (!receivableAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(receivableAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, receivableAccountResult.ErrorMessage ?? "Invalid receivable account.");

        var revenueAccountResult = await GetPostingAccountAsync(tenantId, revenueAccountId, cancellationToken);
        if (!revenueAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(revenueAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, revenueAccountResult.ErrorMessage ?? "Invalid revenue account.");

        Account? taxAccount = null;
        if (invoice.TaxTotal > 0m)
        {
            if (!taxLiabilityAccountId.HasValue)
                return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tax liability account is required when tax total is greater than zero.");

            var taxAccountResult = await GetPostingAccountAsync(tenantId, taxLiabilityAccountId.Value, cancellationToken);
            if (!taxAccountResult.Succeeded)
                return ServiceResult<JournalEntry>.Failure(taxAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, taxAccountResult.ErrorMessage ?? "Invalid tax liability account.");
            taxAccount = taxAccountResult.Value;
        }

        var lines = new List<JournalEntryLine>
        {
            CreateLine(tenantId, receivableAccountId, 1, $"AR for {invoice.InvoiceNumber}", invoice.GrandTotal, 0m),
            CreateLine(tenantId, revenueAccountId, 2, $"Revenue for {invoice.InvoiceNumber}", 0m, invoice.Subtotal),
        };

        if (invoice.TaxTotal > 0m && taxAccount is not null)
        {
            lines.Add(CreateLine(tenantId, taxAccount.Id, lines.Count + 1, $"Tax liability for {invoice.InvoiceNumber}", 0m, invoice.TaxTotal));
        }

        return await CreateAndPersistJournalEntryAsync(
            tenantId,
            fiscalPeriod.Id,
            nameof(SalesInvoice),
            invoice.Id,
            postingDate,
            $"Post sales invoice {invoice.InvoiceNumber}",
            lines,
            cancellationToken);
    }

    public async Task<ServiceResult<JournalEntry>> PostPurchaseInvoiceAsync(
        Guid purchaseInvoiceId,
        Guid payableAccountId,
        Guid expenseAccountId,
        Guid? taxReceivableAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var invoice = await dbContext.PurchaseInvoices
            .FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == tenantId, cancellationToken);

        if (invoice is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Purchase invoice is not eligible for posting.");

        if (await HasDuplicatePostingAsync(tenantId, nameof(PurchaseInvoice), purchaseInvoiceId, cancellationToken))
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status409Conflict, "Purchase invoice has already been posted.");

        var fiscalPeriod = await GetOpenFiscalPeriodAsync(tenantId, postingDate, cancellationToken);
        if (fiscalPeriod is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "No open fiscal period found for posting date.");

        var payableAccountResult = await GetPostingAccountAsync(tenantId, payableAccountId, cancellationToken);
        if (!payableAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(payableAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, payableAccountResult.ErrorMessage ?? "Invalid payable account.");

        var expenseAccountResult = await GetPostingAccountAsync(tenantId, expenseAccountId, cancellationToken);
        if (!expenseAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(expenseAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, expenseAccountResult.ErrorMessage ?? "Invalid expense account.");

        Account? taxAccount = null;
        if (invoice.TaxTotal > 0m)
        {
            if (!taxReceivableAccountId.HasValue)
                return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tax receivable account is required when tax total is greater than zero.");

            var taxAccountResult = await GetPostingAccountAsync(tenantId, taxReceivableAccountId.Value, cancellationToken);
            if (!taxAccountResult.Succeeded)
                return ServiceResult<JournalEntry>.Failure(taxAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, taxAccountResult.ErrorMessage ?? "Invalid tax receivable account.");
            taxAccount = taxAccountResult.Value;
        }

        var lines = new List<JournalEntryLine>
        {
            CreateLine(tenantId, expenseAccountId, 1, $"Expense for {invoice.InvoiceNumber}", invoice.Subtotal, 0m),
            CreateLine(tenantId, payableAccountId, 2, $"AP for {invoice.InvoiceNumber}", 0m, invoice.GrandTotal),
        };

        if (invoice.TaxTotal > 0m && taxAccount is not null)
        {
            lines.Add(CreateLine(tenantId, taxAccount.Id, lines.Count + 1, $"Tax receivable for {invoice.InvoiceNumber}", invoice.TaxTotal, 0m));
        }

        return await CreateAndPersistJournalEntryAsync(
            tenantId,
            fiscalPeriod.Id,
            nameof(PurchaseInvoice),
            invoice.Id,
            postingDate,
            $"Post purchase invoice {invoice.InvoiceNumber}",
            lines,
            cancellationToken);
    }

    public async Task<ServiceResult<JournalEntry>> PostCustomerPaymentAsync(
        Guid customerPaymentId,
        Guid cashAccountId,
        Guid receivableAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var payment = await dbContext.CustomerPayments
            .FirstOrDefaultAsync(x => x.Id == customerPaymentId && x.TenantId == tenantId, cancellationToken);

        if (payment is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status404NotFound, "Customer payment not found.");

        if (payment.Amount <= 0m)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Customer payment amount must be greater than zero.");

        if (await HasDuplicatePostingAsync(tenantId, nameof(CustomerPayment), customerPaymentId, cancellationToken))
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status409Conflict, "Customer payment has already been posted.");

        var fiscalPeriod = await GetOpenFiscalPeriodAsync(tenantId, postingDate, cancellationToken);
        if (fiscalPeriod is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "No open fiscal period found for posting date.");

        var cashAccountResult = await GetPostingAccountAsync(tenantId, cashAccountId, cancellationToken);
        if (!cashAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(cashAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, cashAccountResult.ErrorMessage ?? "Invalid cash account.");

        var receivableAccountResult = await GetPostingAccountAsync(tenantId, receivableAccountId, cancellationToken);
        if (!receivableAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(receivableAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, receivableAccountResult.ErrorMessage ?? "Invalid receivable account.");

        var lines = new List<JournalEntryLine>
        {
            CreateLine(tenantId, cashAccountId, 1, $"Cash receipt for customer payment {payment.Id}", payment.Amount, 0m),
            CreateLine(tenantId, receivableAccountId, 2, $"AR settlement for customer payment {payment.Id}", 0m, payment.Amount),
        };

        return await CreateAndPersistJournalEntryAsync(
            tenantId,
            fiscalPeriod.Id,
            nameof(CustomerPayment),
            payment.Id,
            postingDate,
            $"Post customer payment {payment.Id}",
            lines,
            cancellationToken);
    }

    public async Task<ServiceResult<JournalEntry>> PostVendorPaymentAsync(
        Guid vendorPaymentId,
        Guid payableAccountId,
        Guid cashAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var payment = await dbContext.VendorPayments
            .FirstOrDefaultAsync(x => x.Id == vendorPaymentId && x.TenantId == tenantId, cancellationToken);

        if (payment is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status404NotFound, "Vendor payment not found.");

        if (payment.Amount <= 0m)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Vendor payment amount must be greater than zero.");

        if (await HasDuplicatePostingAsync(tenantId, nameof(VendorPayment), vendorPaymentId, cancellationToken))
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status409Conflict, "Vendor payment has already been posted.");

        var fiscalPeriod = await GetOpenFiscalPeriodAsync(tenantId, postingDate, cancellationToken);
        if (fiscalPeriod is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "No open fiscal period found for posting date.");

        var payableAccountResult = await GetPostingAccountAsync(tenantId, payableAccountId, cancellationToken);
        if (!payableAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(payableAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, payableAccountResult.ErrorMessage ?? "Invalid payable account.");

        var cashAccountResult = await GetPostingAccountAsync(tenantId, cashAccountId, cancellationToken);
        if (!cashAccountResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(cashAccountResult.StatusCode ?? StatusCodes.Status400BadRequest, cashAccountResult.ErrorMessage ?? "Invalid cash account.");

        var lines = new List<JournalEntryLine>
        {
            CreateLine(tenantId, payableAccountId, 1, $"AP settlement for vendor payment {payment.Id}", payment.Amount, 0m),
            CreateLine(tenantId, cashAccountId, 2, $"Cash disbursement for vendor payment {payment.Id}", 0m, payment.Amount),
        };

        return await CreateAndPersistJournalEntryAsync(
            tenantId,
            fiscalPeriod.Id,
            nameof(VendorPayment),
            payment.Id,
            postingDate,
            $"Post vendor payment {payment.Id}",
            lines,
            cancellationToken);
    }

    public async Task<ServiceResult<JournalEntry>> ReverseJournalAsync(
        Guid journalEntryId,
        DateOnly reversalDate,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var journal = await dbContext.JournalEntries
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == journalEntryId && x.TenantId == tenantId, cancellationToken);

        if (journal is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status404NotFound, "Journal entry not found.");

        if (journal.Status != JournalEntryStatus.Posted)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Only posted journal entries can be reversed.");

        if (await dbContext.JournalEntries.AnyAsync(x => x.TenantId == tenantId && x.ReversedJournalEntryId == journal.Id, cancellationToken))
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status409Conflict, "Journal entry has already been reversed.");

        var fiscalPeriod = await GetOpenFiscalPeriodAsync(tenantId, reversalDate, cancellationToken);
        if (fiscalPeriod is null)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "No open fiscal period found for reversal date.");

        var reverseLines = journal.Lines
            .OrderBy(x => x.LineNumber)
            .Select((line, index) => CreateLine(
                tenantId,
                line.AccountId,
                index + 1,
                $"Reversal: {line.Description}",
                line.CreditAmount,
                line.DebitAmount))
            .ToList();

        var result = await CreateAndPersistJournalEntryAsync(
            tenantId,
            fiscalPeriod.Id,
            $"{journal.SourceDocumentType}Reversal",
            journal.SourceDocumentId,
            reversalDate,
            $"Reversal of {journal.JournalNumber}",
            reverseLines,
            cancellationToken,
            reversedJournalEntryId: journal.Id);

        if (!result.Succeeded)
            return result;

        journal.Status = JournalEntryStatus.Reversed;
        await dbContext.SaveChangesAsync(cancellationToken);

        return result;
    }

    private async Task<ServiceResult<Account>> GetPostingAccountAsync(Guid tenantId, Guid accountId, CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == accountId && x.TenantId == tenantId, cancellationToken);
        if (account is null)
            return ServiceResult<Account>.Failure(StatusCodes.Status400BadRequest, $"Account {accountId} was not found.");

        if (!account.IsPostingAllowed || !account.IsActive)
            return ServiceResult<Account>.Failure(StatusCodes.Status400BadRequest, $"Account {account.Code} is not eligible for posting.");

        return ServiceResult<Account>.Success(account);
    }

    private async Task<bool> HasDuplicatePostingAsync(
        Guid tenantId,
        string sourceDocumentType,
        Guid sourceDocumentId,
        CancellationToken cancellationToken)
    {
        return await dbContext.JournalEntries.AnyAsync(
            x => x.TenantId == tenantId
                 && x.SourceDocumentType == sourceDocumentType
                 && x.SourceDocumentId == sourceDocumentId
                 && x.Status != JournalEntryStatus.Reversed,
            cancellationToken);
    }

    private async Task<FiscalPeriod?> GetOpenFiscalPeriodAsync(Guid tenantId, DateOnly postingDate, CancellationToken cancellationToken)
    {
        return await dbContext.FiscalPeriods.FirstOrDefaultAsync(
            x => x.TenantId == tenantId
                 && !x.IsClosed
                 && x.StartDate <= postingDate
                 && x.EndDate >= postingDate,
            cancellationToken);
    }

    private async Task<ServiceResult<JournalEntry>> CreateAndPersistJournalEntryAsync(
        Guid tenantId,
        Guid fiscalPeriodId,
        string sourceDocumentType,
        Guid? sourceDocumentId,
        DateOnly postingDate,
        string description,
        IReadOnlyCollection<JournalEntryLine> lines,
        CancellationToken cancellationToken,
        Guid? reversedJournalEntryId = null)
    {
        if (lines.Count < 2)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "A journal entry requires at least two lines.");

        var totalDebit = lines.Sum(x => x.DebitAmount);
        var totalCredit = lines.Sum(x => x.CreditAmount);
        if (totalDebit != totalCredit)
            return ServiceResult<JournalEntry>.Failure(StatusCodes.Status400BadRequest, "Journal entry is not balanced.");

        var journal = new JournalEntry
        {
            TenantId = tenantId,
            JournalNumber = string.Empty,
            SourceDocumentType = sourceDocumentType,
            SourceDocumentId = sourceDocumentId,
            PostingDate = postingDate,
            FiscalPeriodId = fiscalPeriodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            Description = description,
            ReversedJournalEntryId = reversedJournalEntryId,
            Lines = lines.ToList(),
        };

        var journalNumberResult = await _numberingService.GenerateNextAsync("JOURNAL_ENTRY", postingDate, cancellationToken);
        if (!journalNumberResult.Succeeded)
            return ServiceResult<JournalEntry>.Failure(journalNumberResult.StatusCode ?? StatusCodes.Status400BadRequest, journalNumberResult.ErrorMessage ?? "Failed to generate journal number.");

        journal.JournalNumber = journalNumberResult.Value!;

        dbContext.JournalEntries.Add(journal);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<JournalEntry>.Success(journal);
    }

    private static JournalEntryLine CreateLine(
        Guid tenantId,
        Guid accountId,
        int lineNumber,
        string? description,
        decimal debitAmount,
        decimal creditAmount)
    {
        return new JournalEntryLine
        {
            TenantId = tenantId,
            AccountId = accountId,
            LineNumber = lineNumber,
            Description = description,
            DebitAmount = debitAmount,
            CreditAmount = creditAmount,
        };
    }

}
