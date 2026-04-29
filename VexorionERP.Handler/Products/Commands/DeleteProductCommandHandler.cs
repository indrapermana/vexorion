using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteProductCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteProductCommand, Product>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteProductCommand request) => request.ProductId;
}