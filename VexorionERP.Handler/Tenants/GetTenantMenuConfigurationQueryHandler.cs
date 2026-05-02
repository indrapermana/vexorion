using System.Text.Json;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantMenuConfigurationQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantMenuConfigurationQuery, ServiceResult<TenantPreferencesResponse>>
{
    public async ValueTask<ServiceResult<TenantPreferencesResponse>> Handle(GetTenantMenuConfigurationQuery request, CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var tenantExists = await dbContext.Tenants.AnyAsync(x => x.Id == request.TenantId, cancellationToken);
        if (!tenantExists)
        {
            return ServiceResult<TenantPreferencesResponse>.Failure(StatusCodes.Status404NotFound, "Tenant not found.");
        }

        var preference = await dbContext.TenantPreferences
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.TenantId == request.TenantId, cancellationToken);

        if (preference is null)
        {
            preference = new TenantPreference
            {
                TenantId = request.TenantId,
                MenuHiddenLinksJson = "[]",
                DefaultDiscountPercent = 0m,
                MaxManualDiscountPercent = 25m,
                AllowNegativeDiscount = false,
            };

            dbContext.TenantPreferences.Add(preference);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ServiceResult<TenantPreferencesResponse>.Success(new TenantPreferencesResponse
        {
            HiddenMenuLinks = ParseHiddenLinks(preference.MenuHiddenLinksJson),
            DefaultDiscountPercent = preference.DefaultDiscountPercent,
            MaxManualDiscountPercent = preference.MaxManualDiscountPercent,
            AllowNegativeDiscount = preference.AllowNegativeDiscount,
        });
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
}
