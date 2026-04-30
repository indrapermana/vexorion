using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateProductIdentifierCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateProductIdentifierCommand, ProductIdentifier, UpdateProductIdentifierRequest, ProductIdentifierDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateProductIdentifierCommand request) => request.IdentifierId;

    protected override UpdateProductIdentifierRequest GetUpdateRequest(UpdateProductIdentifierCommand request) => request.Request;
}
