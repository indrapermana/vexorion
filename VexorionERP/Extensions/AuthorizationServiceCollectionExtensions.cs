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

            options.AddPolicy(AppPermissions.Documents.ViewOrDownloadPolicy, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(context =>
                    context.User.HasClaim(AppClaimTypes.Permission, AppPermissions.Documents.View)
                    || context.User.HasClaim(AppClaimTypes.Permission, AppPermissions.Documents.Download));
                        options.AddPolicy(AppPermissions.ProjectDocuments.ViewOrDownloadPolicy, policy =>
                        {
                            policy.RequireAuthenticatedUser();
                            policy.RequireAssertion(context =>
                                context.User.HasClaim(AppClaimTypes.Permission, AppPermissions.ProjectDocuments.View)
                                || context.User.HasClaim(AppClaimTypes.Permission, AppPermissions.ProjectDocuments.Download));
                        });
            });
        });

        return services;
    }
}
