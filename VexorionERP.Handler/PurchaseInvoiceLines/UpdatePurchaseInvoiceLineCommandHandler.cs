using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdatePurchaseInvoiceLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdatePurchaseInvoiceLineCommand, ServiceResult<PurchaseInvoiceLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<PurchaseInvoiceLineDetailsResponse>> Handle(UpdatePurchaseInvoiceLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<PurchaseInvoice, PurchaseInvoiceLine>>();
        var result = await commandService.UpdateAsync(request.PurchaseInvoiceId, request.PurchaseInvoiceLineId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<PurchaseInvoiceLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Success(result.Value!.Adapt<PurchaseInvoiceLineDetailsResponse>());
    }
}
