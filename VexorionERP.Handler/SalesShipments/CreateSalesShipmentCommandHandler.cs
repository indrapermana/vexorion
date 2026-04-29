using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateSalesShipmentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreateSalesShipmentCommand, ServiceResult<SalesShipmentDetailsResponse>>
{
    public async ValueTask<ServiceResult<SalesShipmentDetailsResponse>> Handle(CreateSalesShipmentCommand request, CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ICommandService<SalesShipment>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var result = await commandService.CreateAsync(request.Request, dbContext, cancellationToken);

        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<SalesShipmentDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var mapped = result.Value!.Adapt<SalesShipmentDetailsResponse>();
        return ServiceResult<SalesShipmentDetailsResponse>.Success(mapped);
    }
}
