using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetSalesInvoiceLineByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetSalesInvoiceLineByIdQuery, ServiceResult<SalesInvoiceLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<SalesInvoiceLineDetailsResponse>> Handle(GetSalesInvoiceLineByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<SalesInvoice, SalesInvoiceLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var result = await queryService.GetByIdAsync(request.SalesInvoiceId, request.SalesInvoiceLineId, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<SalesInvoiceLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        return ServiceResult<SalesInvoiceLineDetailsResponse>.Success(result.Value!.Adapt<SalesInvoiceLineDetailsResponse>());
    }
}
