using Mediator;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTaxCodeByIdQueryHandler(IServiceProvider serviceProvider)
    : TaxCodeHandlerBase(serviceProvider), IRequestHandler<GetTaxCodeByIdQuery, ServiceResult<TaxCodeDetailsResponse>>
{
    public async ValueTask<ServiceResult<TaxCodeDetailsResponse>> Handle(GetTaxCodeByIdQuery request, CancellationToken cancellationToken)
    {
        if (!TenantId.HasValue)
        {
            return MissingTenant<TaxCodeDetailsResponse>();
        }

        var taxCode = await DbContext.TaxCodes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.TaxCodeId && x.TenantId == TenantId.Value, cancellationToken);

        if (taxCode is null)
        {
            return ServiceResult<TaxCodeDetailsResponse>.Failure(404, "Tax code not found.");
        }

        return ServiceResult<TaxCodeDetailsResponse>.Success(new TaxCodeDetailsResponse
        {
            Id = taxCode.Id,
            TenantId = taxCode.TenantId,
            Code = taxCode.Code,
            Name = taxCode.Name,
            RatePercent = taxCode.RatePercent,
            IsInclusive = taxCode.IsInclusive,
        });
    }
}
