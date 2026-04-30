using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProductIdentifierByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetProductIdentifierByIdQuery, ProductIdentifier, ProductIdentifierDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetProductIdentifierByIdQuery request) => request.IdentifierId;
}
