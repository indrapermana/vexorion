using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class TenantPreferencesHandlerBase(IServiceProvider serviceProvider)
{
    protected AppDbContext DbContext => serviceProvider.GetRequiredService<AppDbContext>();

    protected ICurrentTenantProvider CurrentTenantProvider => serviceProvider.GetRequiredService<ICurrentTenantProvider>();

    protected static ServiceResult<TenantPreferencesResponse> MissingTenant()
    {
        return ServiceResult<TenantPreferencesResponse>.Failure(400, "Tenant context is required.");
    }

    protected async Task<TenantPreference?> GetOrCreatePreferenceAsync(CancellationToken cancellationToken, bool persistIfMissing = true)
    {
        if (!CurrentTenantProvider.TenantId.HasValue)
        {
            return null;
        }

        var tenantId = CurrentTenantProvider.TenantId.Value;

        var preference = await DbContext.TenantPreferences
            .FirstOrDefaultAsync(x => x.TenantId == tenantId, cancellationToken);

        if (preference is not null)
        {
            return preference;
        }

        preference = new TenantPreference
        {
            TenantId = tenantId,
            MenuHiddenLinksJson = "[]",
            DefaultDiscountPercent = 0m,
            MaxManualDiscountPercent = 25m,
            AllowNegativeDiscount = false,
        };

        if (persistIfMissing)
        {
            DbContext.TenantPreferences.Add(preference);
            await DbContext.SaveChangesAsync(cancellationToken);
        }
        return preference;
    }

    protected static TenantPreferencesResponse ToResponse(TenantPreference preference)
    {
        return new TenantPreferencesResponse
        {
            HiddenMenuLinks = ParseHiddenLinks(preference.MenuHiddenLinksJson),
            DefaultDiscountPercent = preference.DefaultDiscountPercent,
            MaxManualDiscountPercent = preference.MaxManualDiscountPercent,
            AllowNegativeDiscount = preference.AllowNegativeDiscount,
        };
    }

    protected static string[] ParseHiddenLinks(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<string[]>(json);
            return parsed is null
                ? []
                : parsed.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct(StringComparer.Ordinal).ToArray();
        }
        catch
        {
            return [];
        }
    }

    protected static decimal ClampPercent(decimal value)
    {
        return Math.Min(100m, Math.Max(0m, value));
    }
}
