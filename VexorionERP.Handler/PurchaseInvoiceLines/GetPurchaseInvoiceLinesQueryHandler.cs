using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetPurchaseInvoiceLinesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetPurchaseInvoiceLinesQuery, ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>> Handle(GetPurchaseInvoiceLinesQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<PurchaseInvoice, PurchaseInvoiceLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var result = await queryService.GetAllForParentAsync(request.PurchaseInvoiceId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Success(result.Value!.Adapt<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>());
    }
}
