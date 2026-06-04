using System.Text.Json;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Middleware;

/// <summary>
/// Middleware that captures authorization boundary 403 Forbid responses and logs them as audit events.
/// This ensures that access-denied decisions made by ASP.NET Authorization policies (before controller execution)
/// are audited with the same rigor as business-rule denials in service layers.
/// </summary>
public sealed class AuthorizationBoundaryAuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AuthorizationBoundaryAuditMiddleware> _logger;

    public AuthorizationBoundaryAuditMiddleware(
        RequestDelegate next,
        IServiceProvider serviceProvider,
        ILogger<AuthorizationBoundaryAuditMiddleware> logger)
    {
        _next = next;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var originalResponseStream = context.Response.Body;
        using var responseBuffer = new MemoryStream();
        context.Response.Body = responseBuffer;

        try
        {
            await _next(context);

            // Check if response is 403 Forbid
            if (context.Response.StatusCode == StatusCodes.Status403Forbidden)
            {
                await LogAccessDeniedAsync(context);
            }

            // Copy buffered response to original stream
            responseBuffer.Seek(0, SeekOrigin.Begin);
            await responseBuffer.CopyToAsync(originalResponseStream);
        }
        finally
        {
            context.Response.Body = originalResponseStream;
        }
    }

    private async Task LogAccessDeniedAsync(HttpContext context)
    {
        try
        {
            // Use the request services from the current HttpContext instead of creating a new scope
            var auditLogger = context.RequestServices.GetRequiredService<IAuditLogger>();
            var currentTenantProvider = context.RequestServices.GetRequiredService<ICurrentTenantProvider>();
            var logger = context.RequestServices.GetRequiredService<ILogger<AuthorizationBoundaryAuditMiddleware>>();

            // Try to get tenant from HttpContext first (via ICurrentTenantProvider)
            var tenantId = currentTenantProvider.TenantId;

            // If not available via provider, try to extract from request headers (for testing)
            if (!tenantId.HasValue && context.Request.Headers.TryGetValue("X-Test-TenantId", out var tenantIdHeader))
            {
                if (Guid.TryParse(tenantIdHeader.ToString(), out var parsedTenantId))
                {
                    tenantId = parsedTenantId;
                }
            }

            if (!tenantId.HasValue)
            {
                // If no tenant context is available, we cannot audit
                logger.LogDebug("Authorization boundary audit skipped: no tenant context");
                return;
            }

            var actorUserId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid? actorUserIdGuid = null;
            if (Guid.TryParse(actorUserId, out var parsed))
            {
                actorUserIdGuid = parsed;
            }

            var resourcePath = context.Request.Path.Value ?? string.Empty;
            var requestMethod = context.Request.Method;

            // Extract entity type from path (e.g., /api/projects/{id}/... → "projects")
            var pathSegments = resourcePath.TrimStart('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
            var entityType = pathSegments.Length > 1 ? pathSegments[1] : "resource";

            var metadata = new
            {
                Method = requestMethod,
                Path = resourcePath,
                QueryString = context.Request.QueryString.Value,
                StatusCode = context.Response.StatusCode
            };

            var description = $"Access denied by authorization policy for {requestMethod} {resourcePath}";
            var eventType = "authorization.access_denied";

            await auditLogger.LogAsync(
                eventType: eventType,
                tenantId: tenantId.Value,
                actorUserId: actorUserIdGuid,
                targetUserId: null,
                entityName: entityType,
                entityId: null,
                description: description,
                metadata: metadata
            );

            logger.LogInformation("Authorization boundary access denied audit logged for {Method} {Path}", requestMethod, resourcePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging authorization boundary audit event");
            // Don't throw; allow the response to proceed even if audit logging fails
        }
    }
}

/// <summary>
/// Extension method to add authorization boundary audit middleware to the pipeline.
/// </summary>
public static class AuthorizationBoundaryAuditMiddlewareExtensions
{
    public static IApplicationBuilder UseAuthorizationBoundaryAudit(this IApplicationBuilder app)
    {
        app.UseMiddleware<AuthorizationBoundaryAuditMiddleware>();
        return app;
    }
}
