using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProductIdentifiersQuery(Guid ProductId) : IRequest<ServiceResult<IReadOnlyCollection<ProductIdentifierListItemResponse>>>;
