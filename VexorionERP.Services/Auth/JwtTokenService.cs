using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using VexorionERP;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class JwtTokenService(
    AppDbContext dbContext,
    UserManager<User> userManager,
    IOptions<JwtOptions> jwtOptions) : ITokenService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public async Task<LoginResponse> IssueTokenPairAsync(User user, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var accessExpiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);
        var refreshToken = GenerateRefreshToken();
        var refreshTokenHash = ComputeHash(refreshToken);

        var entity = new RefreshToken
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAtUtc = refreshExpiresAt,
            CreatedByIpAddress = ipAddress,
            UserAgent = userAgent
        };

        dbContext.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new LoginResponse
        {
            AccessToken = await GenerateAccessTokenAsync(user, accessExpiresAt),
            ExpiresAtUtc = accessExpiresAt,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAtUtc = refreshExpiresAt
        };
    }

    public async Task<LoginResponse?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var tokenHash = ComputeHash(refreshToken);
        var entity = await dbContext.Set<RefreshToken>()
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (entity is null || entity.RevokedAtUtc.HasValue || entity.ExpiresAtUtc <= DateTime.UtcNow || entity.User is null || !entity.User.IsActive)
        {
            return null;
        }

        var tenantIsActive = await dbContext.Tenants
            .AsNoTracking()
            .AnyAsync(x => x.Id == entity.TenantId && x.IsActive, cancellationToken);
        if (!tenantIsActive)
        {
            return null;
        }

        var replacementToken = GenerateRefreshToken();
        var replacementHash = ComputeHash(replacementToken);
        entity.RevokedAtUtc = DateTime.UtcNow;
        entity.RevokedByIpAddress = ipAddress;
        entity.ReplacedByTokenHash = replacementHash;

        var refreshExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);
        dbContext.Add(new RefreshToken
        {
            TenantId = entity.TenantId,
            UserId = entity.UserId,
            TokenHash = replacementHash,
            ExpiresAtUtc = refreshExpiresAt,
            CreatedByIpAddress = ipAddress,
            UserAgent = userAgent
        });

        entity.User.LastLoginAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        var accessExpiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes);
        return new LoginResponse
        {
            AccessToken = await GenerateAccessTokenAsync(entity.User, accessExpiresAt),
            ExpiresAtUtc = accessExpiresAt,
            RefreshToken = replacementToken,
            RefreshTokenExpiresAtUtc = refreshExpiresAt
        };
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var tokenHash = ComputeHash(refreshToken);
        var entity = await dbContext.Set<RefreshToken>()
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (entity is null || entity.RevokedAtUtc.HasValue)
        {
            return;
        }

        entity.RevokedAtUtc = DateTime.UtcNow;
        entity.RevokedByIpAddress = ipAddress;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllUserRefreshTokensAsync(Guid userId, Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var tokens = await dbContext.Set<RefreshToken>()
            .Where(x => x.UserId == userId && x.TenantId == tenantId && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            token.RevokedByIpAddress = ipAddress;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllTenantRefreshTokensAsync(Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var tokens = await dbContext.Set<RefreshToken>()
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            token.RevokedByIpAddress = ipAddress;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> GenerateAccessTokenAsync(User user, DateTime expiresAtUtc)
    {
        var roles = await userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName ?? string.Empty),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(AppClaimTypes.TenantId, user.TenantId.ToString())
        };

        if (!string.IsNullOrWhiteSpace(user.FirstName))
        {
            claims.Add(new Claim("given_name", user.FirstName));
        }

        if (!string.IsNullOrWhiteSpace(user.LastName))
        {
            claims.Add(new Claim("family_name", user.LastName));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var permissionClaims = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var role in roles)
        {
            if (RolePermissionMatrix.All.TryGetValue(role, out var permissions))
            {
                foreach (var permission in permissions)
                {
                    permissionClaims.Add(permission);
                }
            }
        }

        foreach (var permission in permissionClaims)
        {
            claims.Add(new Claim(AppClaimTypes.Permission, permission));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = _jwtOptions.Issuer,
            Audience = _jwtOptions.Audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(descriptor);
        return tokenHandler.WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string ComputeHash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}
