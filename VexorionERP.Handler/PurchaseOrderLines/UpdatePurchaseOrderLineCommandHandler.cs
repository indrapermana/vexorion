using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdatePurchaseOrderLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdatePurchaseOrderLineCommand, ServiceResult<PurchaseOrderLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<PurchaseOrderLineDetailsResponse>> Handle(UpdatePurchaseOrderLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<PurchaseOrder, PurchaseOrderLine>>();

        var result = await commandService.UpdateAsync(request.PurchaseOrderId, request.PurchaseOrderLineId, request.Request, cancellationToken);

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
