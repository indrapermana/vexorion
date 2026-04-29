using Mediator;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTaxCodesQueryHandler(IServiceProvider serviceProvider)
    : TaxCodeHandlerBase(serviceProvider), IRequestHandler<GetTaxCodesQuery, ServiceResult<IReadOnlyCollection<TaxCodeListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<TaxCodeListItemResponse>>> Handle(GetTaxCodesQuery request, CancellationToken cancellationToken)
    {
        if (!TenantId.HasValue)
        {
            return MissingTenant<IReadOnlyCollection<TaxCodeListItemResponse>>();
        }

        var items = await DbContext.TaxCodes
            .AsNoTracking()
            .Where(x => x.TenantId == TenantId.Value)
            .OrderBy(x => x.Code)
            .Select(x => new TaxCodeListItemResponse
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                RatePercent = x.RatePercent,
                IsInclusive = x.IsInclusive,
            })
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<TaxCodeListItemResponse>>.Success(items);
    }
}
