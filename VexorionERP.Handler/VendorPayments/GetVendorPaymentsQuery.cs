using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetVendorPaymentsQuery(Guid? PurchaseInvoiceId = null) : IRequest<ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>>;
