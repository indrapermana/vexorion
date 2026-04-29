using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateStockCountLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateStockCountLineCommand, ServiceResult<StockCountLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<StockCountLineDetailsResponse>> Handle(UpdateStockCountLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<StockCount, StockCountLine>>();
        var result = await commandService.UpdateAsync(request.StockCountId, request.StockCountLineId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<StockCountLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<StockCountLineDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<StockCountLineDetailsResponse>.Success(result.Value!.Adapt<StockCountLineDetailsResponse>());
    }
}
