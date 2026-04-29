using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeletePurchaseOrderLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<DeletePurchaseOrderLineCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(DeletePurchaseOrderLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<PurchaseOrder, PurchaseOrderLine>>();

        var result = await commandService.DeleteAsync(request.PurchaseOrderId, request.PurchaseOrderLineId, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<bool>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<bool>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<bool>.Success(true);
    }
}
