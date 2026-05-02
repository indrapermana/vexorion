using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UploadProductImageCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UploadProductImageCommand, ServiceResult<ProductImageUploadResponse>>
{
    public async ValueTask<ServiceResult<ProductImageUploadResponse>> Handle(UploadProductImageCommand request, CancellationToken cancellationToken)
    {
        var productImageCommandService = serviceProvider.GetRequiredService<IProductImageCommandService>();
        return await productImageCommandService.UploadAsync(
            request.ProductId,
            request.FileName,
            request.ContentType,
            request.Content,
            cancellationToken);
    }
}
