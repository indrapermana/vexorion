using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetVendorPaymentByIdQuery(Guid VendorPaymentId) : IRequest<ServiceResult<VendorPaymentDetailsResponse>>;
