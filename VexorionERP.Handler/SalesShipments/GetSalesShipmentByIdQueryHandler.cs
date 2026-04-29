using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetSalesShipmentByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetSalesShipmentByIdQuery, ServiceResult<SalesShipmentDetailsResponse>>
{
    public async ValueTask<ServiceResult<SalesShipmentDetailsResponse>> Handle(GetSalesShipmentByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<IChildQueryService<SalesOrder, SalesShipment>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.ShipmentId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<SalesShipmentDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<SalesShipmentDetailsResponse>();
        return ServiceResult<SalesShipmentDetailsResponse>.Success(mapped);
    }
}
