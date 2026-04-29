using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateVendorPaymentCommand(CreateVendorPaymentRequest Request) : IRequest<ServiceResult<VendorPaymentDetailsResponse>>;
