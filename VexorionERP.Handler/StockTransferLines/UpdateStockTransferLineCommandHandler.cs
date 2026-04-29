using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateStockTransferLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateStockTransferLineCommand, ServiceResult<StockTransferLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<StockTransferLineDetailsResponse>> Handle(UpdateStockTransferLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<StockTransfer, StockTransferLine>>();
        var result = await commandService.UpdateAsync(request.StockTransferId, request.StockTransferLineId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<StockTransferLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<StockTransferLineDetailsResponse>.Success(result.Value!.Adapt<StockTransferLineDetailsResponse>());
    }
}
