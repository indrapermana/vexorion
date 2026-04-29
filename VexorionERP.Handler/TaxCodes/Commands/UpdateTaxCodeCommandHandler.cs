using Mediator;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateTaxCodeCommandHandler(IServiceProvider serviceProvider)
    : TaxCodeHandlerBase(serviceProvider), IRequestHandler<UpdateTaxCodeCommand, ServiceResult<TaxCodeDetailsResponse>>
{
    public async ValueTask<ServiceResult<TaxCodeDetailsResponse>> Handle(UpdateTaxCodeCommand request, CancellationToken cancellationToken)
    {
        if (!TenantId.HasValue)
        {
            return MissingTenant<TaxCodeDetailsResponse>();
        }

        var taxCode = await DbContext.TaxCodes
            .FirstOrDefaultAsync(x => x.Id == request.TaxCodeId && x.TenantId == TenantId.Value, cancellationToken);

        if (taxCode is null)
        {
            return ServiceResult<TaxCodeDetailsResponse>.Failure(404, "Tax code not found.");
        }

        var normalizedCode = request.Request.Code.Trim();
        var normalizedName = request.Request.Name.Trim();

        var duplicate = await HasDuplicateCodeAsync(TenantId.Value, normalizedCode, request.TaxCodeId, cancellationToken);
        if (duplicate)
        {
            return ServiceResult<TaxCodeDetailsResponse>.Failure(400, "A tax code with the same code already exists.");
        }

        taxCode.Code = normalizedCode;
        taxCode.Name = normalizedName;
        taxCode.RatePercent = request.Request.RatePercent;
        taxCode.IsInclusive = request.Request.IsInclusive;

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
