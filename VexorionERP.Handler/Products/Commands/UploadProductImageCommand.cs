using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UploadProductImageCommand(
    Guid ProductId,
    string FileName,
    string ContentType,
    byte[] Content) : IRequest<ServiceResult<ProductImageUploadResponse>>;
