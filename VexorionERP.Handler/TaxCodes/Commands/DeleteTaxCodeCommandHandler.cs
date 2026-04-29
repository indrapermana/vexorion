using Mediator;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeleteTaxCodeCommandHandler(IServiceProvider serviceProvider)
    : TaxCodeHandlerBase(serviceProvider), IRequestHandler<DeleteTaxCodeCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(DeleteTaxCodeCommand request, CancellationToken cancellationToken)
    {
        if (!TenantId.HasValue)
        {
            return MissingTenantDelete();
        }

        var taxCode = await DbContext.TaxCodes
            .FirstOrDefaultAsync(x => x.Id == request.TaxCodeId && x.TenantId == TenantId.Value, cancellationToken);

        if (taxCode is null)
        {
            return ServiceResult<bool>.Failure(404, "Tax code not found.");
        }

        DbContext.TaxCodes.Remove(taxCode);
        await DbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }
}
