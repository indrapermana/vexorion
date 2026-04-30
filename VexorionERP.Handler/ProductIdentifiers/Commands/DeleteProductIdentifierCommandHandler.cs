using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteProductIdentifierCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteProductIdentifierCommand, ProductIdentifier>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteProductIdentifierCommand request) => request.IdentifierId;
}
