using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetInvoiceLinesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetInvoiceLinesQuery, ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>> Handle(GetInvoiceLinesQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<Invoice, InvoiceLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetAllForParentAsync(request.InvoiceId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<IReadOnlyCollection<InvoiceLineListItemResponse>>();
        return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.Success(mapped);
    }
}
