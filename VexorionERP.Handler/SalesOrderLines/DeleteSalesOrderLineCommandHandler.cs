using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeleteSalesOrderLineCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<DeleteSalesOrderLineCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(DeleteSalesOrderLineCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ILineCommandService<SalesOrder, SalesOrderLine>>();

        var result = await commandService.DeleteAsync(request.SalesOrderId, request.SalesOrderLineId, cancellationToken);

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
