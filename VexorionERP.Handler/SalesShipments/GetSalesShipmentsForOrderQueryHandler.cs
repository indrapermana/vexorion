using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetSalesShipmentsForOrderQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetSalesShipmentsForOrderQuery, ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>> Handle(GetSalesShipmentsForOrderQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<IChildQueryService<SalesOrder, SalesShipment>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetAllForParentAsync(request.SalesOrderId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!
            .Select(item => item as SalesShipmentListItemResponse ?? item.Adapt<SalesShipmentListItemResponse>())
            .ToArray();
        return ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>.Success(mapped);
    }
}
