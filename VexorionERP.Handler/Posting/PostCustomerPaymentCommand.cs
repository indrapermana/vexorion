using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record PostCustomerPaymentCommand(Guid CustomerPaymentId, PostCustomerPaymentRequest Request) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
