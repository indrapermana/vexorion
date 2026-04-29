using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetPurchaseOrderLineByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetPurchaseOrderLineByIdQuery, ServiceResult<PurchaseOrderLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<PurchaseOrderLineDetailsResponse>> Handle(GetPurchaseOrderLineByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<PurchaseOrder, PurchaseOrderLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.PurchaseOrderId, request.PurchaseOrderLineId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<PurchaseOrderLineDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<PurchaseOrderLineDetailsResponse>();
        return ServiceResult<PurchaseOrderLineDetailsResponse>.Success(mapped);
    }
}
