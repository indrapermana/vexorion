using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseInvoiceByIdQuery(Guid PurchaseInvoiceId) : IRequest<ServiceResult<PurchaseInvoiceDetailsResponse>>;
