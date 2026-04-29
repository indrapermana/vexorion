using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSuppliersQuery() : IRequest<ServiceResult<IReadOnlyCollection<SupplierListItemResponse>>>;
