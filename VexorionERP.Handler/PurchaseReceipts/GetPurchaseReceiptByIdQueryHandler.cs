using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetPurchaseReceiptByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetPurchaseReceiptByIdQuery, ServiceResult<PurchaseReceiptDetailsResponse>>
{
    public async ValueTask<ServiceResult<PurchaseReceiptDetailsResponse>> Handle(GetPurchaseReceiptByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<IChildQueryService<PurchaseOrder, PurchaseReceipt>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.ReceiptId, dbContext, cancellationToken);

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
