using VexorionERP.Models.Finance;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPostingService
{
    Task<ServiceResult<JournalEntry>> PostSalesInvoiceAsync(
        Guid salesInvoiceId,
        Guid receivableAccountId,
        Guid revenueAccountId,
        Guid? taxLiabilityAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<JournalEntry>> PostPurchaseInvoiceAsync(
        Guid purchaseInvoiceId,
        Guid payableAccountId,
        Guid expenseAccountId,
        Guid? taxReceivableAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<JournalEntry>> PostCustomerPaymentAsync(
        Guid customerPaymentId,
        Guid cashAccountId,
        Guid receivableAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<JournalEntry>> PostVendorPaymentAsync(
        Guid vendorPaymentId,
        Guid payableAccountId,
        Guid cashAccountId,
        DateOnly postingDate,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<JournalEntry>> ReverseJournalAsync(
        Guid journalEntryId,
        DateOnly reversalDate,
        CancellationToken cancellationToken = default);
}
