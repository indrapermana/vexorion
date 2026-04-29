using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateSupplierCommand(Guid SupplierId, UpdateSupplierRequest Request) : IRequest<ServiceResult<SupplierDetailsResponse>>;
