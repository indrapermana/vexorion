using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record PostVendorPaymentCommand(Guid VendorPaymentId, PostVendorPaymentRequest Request) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
