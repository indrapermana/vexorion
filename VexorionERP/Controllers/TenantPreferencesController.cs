using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/configuration/preferences")]
[Authorize]
public class TenantPreferencesController(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<TenantPreferencesResponse>> Get(CancellationToken cancellationToken)
    {
        var preference = await GetOrCreatePreferenceAsync(cancellationToken);
        if (preference is null)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        return Ok(ToResponse(preference));
    }

    [HttpPut("menu")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateMenu([FromBody] UpdateMenuConfigurationRequest request, CancellationToken cancellationToken)
    {
        var preference = await GetOrCreatePreferenceAsync(cancellationToken);
        if (preference is null)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        var normalized = request.HiddenMenuLinks
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        preference.MenuHiddenLinksJson = JsonSerializer.Serialize(normalized);
        preference.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(preference));
    }

    [HttpPut("discount")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateDiscount([FromBody] UpdateDiscountConfigurationRequest request, CancellationToken cancellationToken)
    {
        var preference = await GetOrCreatePreferenceAsync(cancellationToken);
        if (preference is null)
        {
            return BadRequest(new { message = "Tenant context is required." });
        }

        preference.DefaultDiscountPercent = ClampPercent(request.DefaultDiscountPercent);
        preference.MaxManualDiscountPercent = ClampPercent(request.MaxManualDiscountPercent);
        preference.AllowNegativeDiscount = request.AllowNegativeDiscount;
        preference.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(preference));
    }

    private async Task<TenantPreference?> GetOrCreatePreferenceAsync(CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return null;
        }

        var tenantId = currentTenantProvider.TenantId.Value;

        var preference = await dbContext.TenantPreferences
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

        dbContext.TenantPreferences.Add(preference);
        await dbContext.SaveChangesAsync(cancellationToken);
        return preference;
    }

    private static TenantPreferencesResponse ToResponse(TenantPreference preference)
    {
        var hiddenMenuLinks = ParseHiddenLinks(preference.MenuHiddenLinksJson);

        return new TenantPreferencesResponse
        {
            HiddenMenuLinks = hiddenMenuLinks,
            DefaultDiscountPercent = preference.DefaultDiscountPercent,
            MaxManualDiscountPercent = preference.MaxManualDiscountPercent,
            AllowNegativeDiscount = preference.AllowNegativeDiscount,
        };
    }

    private static string[] ParseHiddenLinks(string? json)
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

    private static decimal ClampPercent(decimal value)
    {
        return Math.Min(100m, Math.Max(0m, value));
    }
}
