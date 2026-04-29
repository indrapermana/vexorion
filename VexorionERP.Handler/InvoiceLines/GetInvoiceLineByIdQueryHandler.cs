using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetInvoiceLineByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetInvoiceLineByIdQuery, ServiceResult<InvoiceLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<InvoiceLineDetailsResponse>> Handle(GetInvoiceLineByIdQuery request, CancellationToken cancellationToken)
    {
        var queryService = serviceProvider.GetRequiredService<ILineQueryService<Invoice, InvoiceLine>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await queryService.GetByIdAsync(request.InvoiceId, request.InvoiceLineId, dbContext, cancellationToken);

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
