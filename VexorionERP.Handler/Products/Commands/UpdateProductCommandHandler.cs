using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateProductCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateProductCommand, Product, UpdateProductRequest, ProductDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateProductCommand request) => request.ProductId;

    protected override UpdateProductRequest GetUpdateRequest(UpdateProductCommand request) => request.Request;
}