using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetSalesOrderLineByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetSalesOrderLineByIdQuery, ServiceResult<SalesOrderLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<SalesOrderLineDetailsResponse>> Handle(GetSalesOrderLineByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<SalesOrder, SalesOrderLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.SalesOrderId, request.SalesOrderLineId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<SalesOrderLineDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<SalesOrderLineDetailsResponse>();
        return ServiceResult<SalesOrderLineDetailsResponse>.Success(mapped);
    }
}
