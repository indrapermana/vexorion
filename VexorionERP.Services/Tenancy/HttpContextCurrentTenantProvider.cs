using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP;

public class HttpContextCurrentTenantProvider(IHttpContextAccessor httpContextAccessor) : ICurrentTenantProvider
{
    public Guid? TenantId
    {
        get
        {
            var httpContext = httpContextAccessor.HttpContext;
            if (httpContext is null)
            {
                return null;
            }

            var tenantClaim = httpContext.User.FindFirstValue(AppClaimTypes.TenantId);
            if (Guid.TryParse(tenantClaim, out var tenantIdFromClaim))
            {
                return tenantIdFromClaim;
            }

            var tenantCode = httpContext.Request.Headers["X-Tenant-Code"].ToString();
            if (!string.IsNullOrWhiteSpace(tenantCode))
            {
                return null;
            }

            if (httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var headerValues)
                && Guid.TryParse(headerValues.ToString(), out var tenantIdFromHeader))
            {
                return tenantIdFromHeader;
            }

            return null;
        }
    }
}
