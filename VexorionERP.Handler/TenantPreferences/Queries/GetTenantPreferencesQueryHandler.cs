using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantPreferencesQueryHandler(IServiceProvider serviceProvider)
    : TenantPreferencesHandlerBase(serviceProvider), IRequestHandler<GetTenantPreferencesQuery, ServiceResult<TenantPreferencesResponse>>
{
    public async ValueTask<ServiceResult<TenantPreferencesResponse>> Handle(GetTenantPreferencesQuery request, CancellationToken cancellationToken)
    {
        var preference = await GetOrCreatePreferenceAsync(cancellationToken);
        if (preference is null)
        {
            return MissingTenant();
        }

        return ServiceResult<TenantPreferencesResponse>.Success(ToResponse(preference));
    }
}
