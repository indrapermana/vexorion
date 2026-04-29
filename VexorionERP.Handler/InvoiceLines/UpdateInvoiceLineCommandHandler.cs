using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateInvoiceLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateInvoiceLineCommand, ServiceResult<InvoiceLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<InvoiceLineDetailsResponse>> Handle(UpdateInvoiceLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<Invoice, InvoiceLine>>();

        var result = await commandService.UpdateAsync(request.InvoiceId, request.InvoiceLineId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<InvoiceLineDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<InvoiceLineDetailsResponse>();
        return ServiceResult<InvoiceLineDetailsResponse>.Success(mapped);
    }
}
