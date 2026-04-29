using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateTaxCodeCommandHandler(IServiceProvider serviceProvider)
    : TaxCodeHandlerBase(serviceProvider), IRequestHandler<CreateTaxCodeCommand, ServiceResult<TaxCodeDetailsResponse>>
{
    public async ValueTask<ServiceResult<TaxCodeDetailsResponse>> Handle(CreateTaxCodeCommand request, CancellationToken cancellationToken)
    {
        if (!TenantId.HasValue)
        {
            return MissingTenant<TaxCodeDetailsResponse>();
        }

        var normalizedCode = request.Request.Code.Trim();
        var normalizedName = request.Request.Name.Trim();

        var duplicate = await HasDuplicateCodeAsync(TenantId.Value, normalizedCode, null, cancellationToken);
        if (duplicate)
        {
            return ServiceResult<TaxCodeDetailsResponse>.Failure(400, "A tax code with the same code already exists.");
        }

        var taxCode = new TaxCode
        {
            TenantId = TenantId.Value,
            Code = normalizedCode,
            Name = normalizedName,
            RatePercent = request.Request.RatePercent,
            IsInclusive = request.Request.IsInclusive,
        };

        DbContext.TaxCodes.Add(taxCode);
        await DbContext.SaveChangesAsync(cancellationToken);

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
