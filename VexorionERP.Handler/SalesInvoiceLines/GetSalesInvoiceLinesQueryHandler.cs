using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetSalesInvoiceLinesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetSalesInvoiceLinesQuery, ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>> Handle(GetSalesInvoiceLinesQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<SalesInvoice, SalesInvoiceLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var result = await queryService.GetAllForParentAsync(request.SalesInvoiceId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Success(result.Value!.Adapt<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>());
    }
}
