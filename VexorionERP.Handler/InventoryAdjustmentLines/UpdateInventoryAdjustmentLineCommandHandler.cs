using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateInventoryAdjustmentLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateInventoryAdjustmentLineCommand, ServiceResult<InventoryAdjustmentLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<InventoryAdjustmentLineDetailsResponse>> Handle(UpdateInventoryAdjustmentLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<InventoryAdjustment, InventoryAdjustmentLine>>();
        var result = await commandService.UpdateAsync(request.InventoryAdjustmentId, request.InventoryAdjustmentLineId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<InventoryAdjustmentLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Success(result.Value!.Adapt<InventoryAdjustmentLineDetailsResponse>());
    }
}
