using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreatePurchaseInvoiceCommand(CreatePurchaseInvoiceRequest Request) : IRequest<ServiceResult<PurchaseInvoiceDetailsResponse>>;
