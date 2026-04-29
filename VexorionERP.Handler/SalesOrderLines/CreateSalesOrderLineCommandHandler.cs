using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateSalesOrderLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreateSalesOrderLineCommand, ServiceResult<SalesOrderLineDetailsResponse>>
{
    public async ValueTask<ServiceResult<SalesOrderLineDetailsResponse>> Handle(CreateSalesOrderLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<SalesOrder, SalesOrderLine>>();

        var result = await commandService.CreateAsync(request.SalesOrderId, request.Request, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<SalesOrderLineDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<SalesOrderLineDetailsResponse>();
        return ServiceResult<SalesOrderLineDetailsResponse>.Success(mapped);
    }
}
