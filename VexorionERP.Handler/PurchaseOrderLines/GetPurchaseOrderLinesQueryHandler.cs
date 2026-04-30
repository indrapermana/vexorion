using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetPurchaseOrderLinesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetPurchaseOrderLinesQuery, ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>> Handle(GetPurchaseOrderLinesQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<PurchaseOrder, PurchaseOrderLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetAllForParentAsync(request.PurchaseOrderId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as PurchaseOrderLineListItemResponse ?? item.Adapt<PurchaseOrderLineListItemResponse>())
            .ToArray();
        return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.Success(mapped);
    }
}
