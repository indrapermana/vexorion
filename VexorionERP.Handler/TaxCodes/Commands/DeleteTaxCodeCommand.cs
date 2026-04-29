using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteTaxCodeCommand(Guid TaxCodeId) : IRequest<ServiceResult<bool>>;
