using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeleteSalesShipmentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<DeleteSalesShipmentCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(DeleteSalesShipmentCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ICommandService<SalesShipment>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await commandService.DeleteAsync(request.ShipmentId, dbContext, cancellationToken);

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
