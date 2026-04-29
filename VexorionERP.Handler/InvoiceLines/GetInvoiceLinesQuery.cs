using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInvoiceLinesQuery(Guid InvoiceId) : IRequest<ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>>;
