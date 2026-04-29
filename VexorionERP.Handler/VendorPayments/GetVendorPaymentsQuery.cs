using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetVendorPaymentsQuery() : IRequest<ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>>;
