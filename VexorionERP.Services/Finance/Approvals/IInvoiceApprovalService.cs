using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IInvoiceApprovalService
{
    Task<ServiceResult<SalesInvoiceDetailsResponse>> RequestSalesInvoiceApprovalAsync(Guid salesInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceDetailsResponse>> ApproveSalesInvoiceAsync(Guid salesInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceDetailsResponse>> RejectSalesInvoiceAsync(Guid salesInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default);

    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> RequestPurchaseInvoiceApprovalAsync(Guid purchaseInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> ApprovePurchaseInvoiceAsync(Guid purchaseInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> RejectPurchaseInvoiceAsync(Guid purchaseInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default);
}
