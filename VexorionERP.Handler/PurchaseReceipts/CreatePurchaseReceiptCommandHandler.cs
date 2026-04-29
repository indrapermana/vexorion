using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreatePurchaseReceiptCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreatePurchaseReceiptCommand, ServiceResult<PurchaseReceiptDetailsResponse>>
{
    public async ValueTask<ServiceResult<PurchaseReceiptDetailsResponse>> Handle(CreatePurchaseReceiptCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ICommandService<PurchaseReceipt>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await commandService.CreateAsync(request.Request, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<PurchaseReceiptDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<PurchaseReceiptDetailsResponse>();
        return ServiceResult<PurchaseReceiptDetailsResponse>.Success(mapped);
    }
}
