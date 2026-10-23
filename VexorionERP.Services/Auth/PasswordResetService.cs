using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public sealed class PasswordResetService(
    AppDbContext dbContext,
    UserManager<User> userManager,
    ITokenService tokenService,
    IEmailSender emailSender,
    IAuditLogger auditLogger,
    IOptions<JwtOptions> jwtOptions,
    IOptions<EmailOptions> emailOptions,
    ILogger<PasswordResetService> logger) : IPasswordResetService
{
    private const string InvalidTokenMessage = "This reset link is invalid or has expired. Request a new one.";
    private const string InvalidTokenCode = "auth.reset_token_invalid";

    public async Task<ServiceResult<bool>> RequestResetAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        // The outcome is identical for unknown tenants, unknown users, and delivery failures so callers cannot enumerate accounts.
        try
        {
            var user = await FindUserAsync(request, cancellationToken);
            if (user is null || !user.IsActive || string.IsNullOrWhiteSpace(user.Email))
            {
                return ServiceResult<bool>.Success(true);
            }

            var settings = emailOptions.Value;
            if (string.IsNullOrWhiteSpace(settings.MainUiBaseUrl))
            {
                logger.LogError("Password reset email not sent: Email:MainUiBaseUrl is not configured.");
                return ServiceResult<bool>.Success(true);
            }

            var token = CreateToken(user, DateTimeOffset.UtcNow.AddMinutes(settings.PasswordResetMinutes));
            var link = $"{settings.MainUiBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}";
            var displayName = $"{user.FirstName} {user.LastName}".Trim();

            await emailSender.SendAsync(
                PasswordEmailTemplates.PasswordReset(user.Email, request.Locale, displayName, link, settings.PasswordResetMinutes),
                cancellationToken);
            await auditLogger.LogAsync("auth.password_reset_requested", user.TenantId, user.Id, user.Id, nameof(User), user.Id.ToString(), "Password reset email requested.", cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError(ex, "Password reset request could not be completed.");
        }

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> ValidateTokenAsync(ResetTokenRequest request, CancellationToken cancellationToken = default)
    {
        var user = await ResolveTokenUserAsync(request.Token, cancellationToken);
        return user is null ? InvalidToken() : ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> CompleteResetAsync(CompletePasswordResetRequest request, CancellationToken cancellationToken = default)
    {
        var user = await ResolveTokenUserAsync(request.Token, cancellationToken);
        if (user is null)
        {
            return InvalidToken();
        }

        var identityToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, identityToken, request.NewPassword);
        if (!result.Succeeded)
        {
            return ServiceResult<bool>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(request.NewPassword)] = result.Errors.Select(x => x.Description).ToArray()
            });
        }

        await userManager.SetLockoutEndDateAsync(user, null);
        await userManager.ResetAccessFailedCountAsync(user);
        await tokenService.RevokeAllUserRefreshTokensAsync(user.Id, user.TenantId, null, cancellationToken);
        await auditLogger.LogAsync("auth.password_reset_completed", user.TenantId, user.Id, user.Id, nameof(User), user.Id.ToString(), "Password reset through email link.", cancellationToken: cancellationToken);

        try
        {
            await emailSender.SendAsync(
                PasswordEmailTemplates.PasswordChanged(user.Email!, request.Locale, $"{user.FirstName} {user.LastName}".Trim()),
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Password changed notification could not be sent.");
        }

        return ServiceResult<bool>.Success(true);
    }

    private async Task<User?> FindUserAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var normalizedTenantCode = request.TenantCode.Trim().ToUpperInvariant();
        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(x => x.Code.ToUpper() == normalizedTenantCode, cancellationToken);
        if (tenant is null)
        {
            return null;
        }

        var lookup = request.UserNameOrEmail.Trim().ToUpperInvariant();
        return await userManager.Users.FirstOrDefaultAsync(
            x => x.TenantId == tenant.Id && (x.NormalizedUserName == lookup || x.NormalizedEmail == lookup),
            cancellationToken);
    }

    private async Task<User?> ResolveTokenUserAsync(string token, CancellationToken cancellationToken)
    {
        var parts = token.Split('.');
        if (parts.Length != 3
            || !Guid.TryParseExact(parts[0], "N", out var userId)
            || !long.TryParse(parts[1], out var expiresAt)
            || DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiresAt)
        {
            return null;
        }

        byte[] presented;
        try
        {
            presented = WebEncoders.Base64UrlDecode(parts[2]);
        }
        catch (FormatException)
        {
            return null;
        }

        var user = await userManager.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var expected = Sign(user, expiresAt);
        return CryptographicOperations.FixedTimeEquals(presented, expected) ? user : null;
    }

    // Stateless token bound to the user's security stamp and password hash, so it works across instances and dies once used.
    private string CreateToken(User user, DateTimeOffset expiresAt)
    {
        var expiry = expiresAt.ToUnixTimeSeconds();
        return $"{user.Id:N}.{expiry}.{WebEncoders.Base64UrlEncode(Sign(user, expiry))}";
    }

    private byte[] Sign(User user, long expiresAt)
    {
        var rootKey = Encoding.UTF8.GetBytes(jwtOptions.Value.SecretKey);
        var derivedKey = HMACSHA256.HashData(rootKey, Encoding.UTF8.GetBytes("vexorion.password-reset.v1"));
        var payload = $"{user.Id:N}.{expiresAt}.{user.SecurityStamp}.{user.PasswordHash}";
        return HMACSHA256.HashData(derivedKey, Encoding.UTF8.GetBytes(payload));
    }

    private static ServiceResult<bool> InvalidToken() =>
        ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, InvalidTokenMessage, InvalidTokenCode);
}
