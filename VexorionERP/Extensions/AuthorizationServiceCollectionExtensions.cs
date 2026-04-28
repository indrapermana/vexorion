using VexorionERP.Models;

namespace VexorionERP;

public static class AuthorizationServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            foreach (var permission in AppPermissions.All)
            {
                options.AddPolicy(permission, policy =>
                {
                    policy.RequireAuthenticatedUser();
                    policy.RequireClaim(AppClaimTypes.Permission, permission);
                });
            }
        });

        return services;
    }
}
