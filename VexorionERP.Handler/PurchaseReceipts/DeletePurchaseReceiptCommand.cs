using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeletePurchaseReceiptCommand(Guid ReceiptId) : IRequest<ServiceResult<bool>>;
