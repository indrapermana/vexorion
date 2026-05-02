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

public sealed class UpdateTenantMenuConfigurationForTenantCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateTenantMenuConfigurationForTenantCommand, ServiceResult<TenantPreferencesResponse>>
{
    public async ValueTask<ServiceResult<TenantPreferencesResponse>> Handle(UpdateTenantMenuConfigurationForTenantCommand request, CancellationToken cancellationToken)
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
        }

        var normalized = request.Request.HiddenMenuLinks
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        preference.MenuHiddenLinksJson = JsonSerializer.Serialize(normalized);
        preference.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<TenantPreferencesResponse>.Success(new TenantPreferencesResponse
        {
            HiddenMenuLinks = normalized,
            DefaultDiscountPercent = preference.DefaultDiscountPercent,
            MaxManualDiscountPercent = preference.MaxManualDiscountPercent,
            AllowNegativeDiscount = preference.AllowNegativeDiscount,
        });
    }
}
