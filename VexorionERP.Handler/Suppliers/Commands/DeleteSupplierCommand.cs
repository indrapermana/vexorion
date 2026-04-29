using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteSupplierCommand(Guid SupplierId) : IRequest<ServiceResult<bool>>;
