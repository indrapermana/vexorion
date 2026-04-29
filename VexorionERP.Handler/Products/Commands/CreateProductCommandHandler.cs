using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateProductCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateProductCommand, Product, CreateProductRequest, ProductDetailsResponse>(serviceProvider)
{
    protected override CreateProductRequest GetCreateRequest(CreateProductCommand request) => request.Request;
}