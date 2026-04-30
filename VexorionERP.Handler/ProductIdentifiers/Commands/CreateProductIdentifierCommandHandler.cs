using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateProductIdentifierCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateProductIdentifierCommand, ProductIdentifier, CreateProductIdentifierRequest, ProductIdentifierDetailsResponse>(serviceProvider)
{
    protected override CreateProductIdentifierRequest GetCreateRequest(CreateProductIdentifierCommand request) => request.Request;
}
