using System.Text.Json;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateTenantMenuConfigurationCommandHandler(IServiceProvider serviceProvider)
    : TenantPreferencesHandlerBase(serviceProvider), IRequestHandler<UpdateTenantMenuConfigurationCommand, ServiceResult<TenantPreferencesResponse>>
{
    public async ValueTask<ServiceResult<TenantPreferencesResponse>> Handle(UpdateTenantMenuConfigurationCommand request, CancellationToken cancellationToken)
    {
        var preference = await GetOrCreatePreferenceAsync(cancellationToken);
        if (preference is null)
        {
            return MissingTenant();
        }

        var normalized = request.Request.HiddenMenuLinks
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        preference.MenuHiddenLinksJson = JsonSerializer.Serialize(normalized);
        preference.UpdatedAtUtc = DateTime.UtcNow;

        await DbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<TenantPreferencesResponse>.Success(ToResponse(preference));
    }
}
