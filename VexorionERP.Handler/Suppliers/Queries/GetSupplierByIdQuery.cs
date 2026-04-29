using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSupplierByIdQuery(Guid SupplierId) : IRequest<ServiceResult<SupplierDetailsResponse>>;
