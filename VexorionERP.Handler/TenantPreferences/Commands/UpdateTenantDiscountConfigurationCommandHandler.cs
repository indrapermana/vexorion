using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateTenantDiscountConfigurationCommandHandler(IServiceProvider serviceProvider)
    : TenantPreferencesHandlerBase(serviceProvider), IRequestHandler<UpdateTenantDiscountConfigurationCommand, ServiceResult<TenantPreferencesResponse>>
{
    public async ValueTask<ServiceResult<TenantPreferencesResponse>> Handle(UpdateTenantDiscountConfigurationCommand request, CancellationToken cancellationToken)
    {
        var preference = await GetOrCreatePreferenceAsync(cancellationToken);
        if (preference is null)
        {
            return MissingTenant();
        }

        preference.DefaultDiscountPercent = ClampPercent(request.Request.DefaultDiscountPercent);
        preference.MaxManualDiscountPercent = ClampPercent(request.Request.MaxManualDiscountPercent);
        preference.AllowNegativeDiscount = request.Request.AllowNegativeDiscount;
        preference.UpdatedAtUtc = DateTime.UtcNow;

        await DbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<TenantPreferencesResponse>.Success(ToResponse(preference));
    }
}
