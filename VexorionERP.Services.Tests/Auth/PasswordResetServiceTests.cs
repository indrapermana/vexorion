using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PasswordResetServiceTests
{
    private sealed class CapturingEmailSender : IEmailSender
    {
        public List<EmailMessage> Sent { get; } = [];
        public bool Throw { get; set; }
        public bool Timeout { get; set; }

        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            if (Timeout) throw new TaskCanceledException("HttpClient.Timeout elapsed");
            if (Throw) throw new InvalidOperationException("boom");
            Sent.Add(message);
            return Task.CompletedTask;
        }
    }

    private sealed class Harness
    {
        public required PasswordResetService Service { get; init; }
        public required CapturingEmailSender Email { get; init; }
        public required Microsoft.AspNetCore.Identity.UserManager<User> Users { get; init; }
        public required User User { get; init; }
    }

    private static async Task<Harness> BuildAsync(string dbName, string mainUiBaseUrl = "https://app.example.com")
    {
        var (userManager, provider) = IdentityTestHelper.CreateUserManager(dbName);
        var dbContext = provider.GetRequiredService<AppDbContext>();
        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Acme", Code = "ACME" };
        dbContext.Tenants.Add(tenant);
        await dbContext.SaveChangesAsync();

        var user = new User { TenantId = tenant.Id, UserName = "bob", Email = "bob+2@example.com", FirstName = "Bob", LastName = "Builder", IsActive = true };
        var created = await userManager.CreateAsync(user, "OldPass1");
        Assert.True(created.Succeeded);

        var email = new CapturingEmailSender();
        var service = new PasswordResetService(
            dbContext,
            userManager,
            new FakeTokenService(),
            email,
            new NoOpAuditLogger(),
            Options.Create(new JwtOptions { SecretKey = "0123456789abcdef0123456789abcdef" }),
            Options.Create(new EmailOptions { MainUiBaseUrl = mainUiBaseUrl, PasswordResetMinutes = 15 }),
            NullLogger<PasswordResetService>.Instance);

        return new Harness { Service = service, Email = email, Users = userManager, User = user };
    }

    private static string TokenFrom(EmailMessage message)
    {
        const string marker = "reset-password?token=";
        var start = message.TextBody.IndexOf(marker, StringComparison.Ordinal) + marker.Length;
        var end = message.TextBody.IndexOfAny(['\n', ' '], start);
        return Uri.UnescapeDataString(message.TextBody[start..(end < 0 ? message.TextBody.Length : end)]);
    }

    private static ForgotPasswordRequest Forgot(string lookup = "bob", string tenant = "acme") =>
        new() { TenantCode = tenant, UserNameOrEmail = lookup };

    [Fact]
    public async Task RequestReset_SendsLinkEmailToExistingUser()
    {
        var h = await BuildAsync(nameof(RequestReset_SendsLinkEmailToExistingUser));

        var result = await h.Service.RequestResetAsync(Forgot());

        Assert.True(result.Succeeded);
        var mail = Assert.Single(h.Email.Sent);
        Assert.Equal("bob+2@example.com", mail.To);
        Assert.Contains("https://app.example.com/reset-password?token=", mail.TextBody);
    }

    [Theory]
    [InlineData("nobody", "acme")]
    [InlineData("bob", "unknown")]
    public async Task RequestReset_ReturnsSuccessWithoutEmailForUnknownAccounts(string lookup, string tenant)
    {
        var h = await BuildAsync(nameof(RequestReset_ReturnsSuccessWithoutEmailForUnknownAccounts) + lookup + tenant);

        var result = await h.Service.RequestResetAsync(Forgot(lookup, tenant));

        Assert.True(result.Succeeded);
        Assert.Empty(h.Email.Sent);
    }

    [Fact]
    public async Task RequestReset_DoesNotEmailInactiveUsersOrFailOnDeliveryErrors()
    {
        var h = await BuildAsync(nameof(RequestReset_DoesNotEmailInactiveUsersOrFailOnDeliveryErrors));
        h.User.IsActive = false;
        await h.Users.UpdateAsync(h.User);
        Assert.True((await h.Service.RequestResetAsync(Forgot())).Succeeded);
        Assert.Empty(h.Email.Sent);

        h.User.IsActive = true;
        await h.Users.UpdateAsync(h.User);
        h.Email.Throw = true;
        Assert.True((await h.Service.RequestResetAsync(Forgot())).Succeeded);
    }

    [Fact]
    public async Task RequestReset_SwallowsEmailTimeouts()
    {
        var h = await BuildAsync(nameof(RequestReset_SwallowsEmailTimeouts));
        h.Email.Timeout = true;

        Assert.True((await h.Service.RequestResetAsync(Forgot())).Succeeded);
    }

    [Fact]
    public async Task CompleteReset_ChangesPasswordSendsConfirmationAndConsumesToken()
    {
        var h = await BuildAsync(nameof(CompleteReset_ChangesPasswordSendsConfirmationAndConsumesToken));
        await h.Service.RequestResetAsync(Forgot());
        var token = TokenFrom(h.Email.Sent[0]);

        Assert.True((await h.Service.ValidateTokenAsync(new ResetTokenRequest { Token = token })).Succeeded);

        var result = await h.Service.CompleteResetAsync(new CompletePasswordResetRequest { Token = token, NewPassword = "NewPass9", ConfirmPassword = "NewPass9", Locale = "id" });

        Assert.True(result.Succeeded);
        var reloaded = await h.Users.FindByIdAsync(h.User.Id.ToString());
        Assert.True(await h.Users.CheckPasswordAsync(reloaded!, "NewPass9"));
        Assert.Equal(2, h.Email.Sent.Count);
        Assert.Contains("diubah", h.Email.Sent[1].Subject);

        var reuse = await h.Service.CompleteResetAsync(new CompletePasswordResetRequest { Token = token, NewPassword = "Another9", ConfirmPassword = "Another9" });
        Assert.False(reuse.Succeeded);
        Assert.Equal("auth.reset_token_invalid", reuse.ErrorCode);
    }

    [Fact]
    public async Task CompleteReset_RejectsTamperedAndExpiredTokens()
    {
        var h = await BuildAsync(nameof(CompleteReset_RejectsTamperedAndExpiredTokens));
        await h.Service.RequestResetAsync(Forgot());
        var token = TokenFrom(h.Email.Sent[0]);
        var parts = token.Split('.');

        var tampered = $"{parts[0]}.{parts[1]}.{new string('A', parts[2].Length)}";
        var expired = $"{parts[0]}.{DateTimeOffset.UtcNow.AddMinutes(-1).ToUnixTimeSeconds()}.{parts[2]}";

        foreach (var bad in new[] { tampered, expired, "not-a-valid-token-at-all-12345" })
        {
            var result = await h.Service.ValidateTokenAsync(new ResetTokenRequest { Token = bad });
            Assert.False(result.Succeeded);
            Assert.Equal(400, result.StatusCode);
        }
    }

    [Fact]
    public async Task CompleteReset_WeakPasswordKeepsTokenUsable()
    {
        var h = await BuildAsync(nameof(CompleteReset_WeakPasswordKeepsTokenUsable));
        await h.Service.RequestResetAsync(Forgot());
        var token = TokenFrom(h.Email.Sent[0]);

        var weak = await h.Service.CompleteResetAsync(new CompletePasswordResetRequest { Token = token, NewPassword = "abc", ConfirmPassword = "abc" });

        Assert.False(weak.Succeeded);
        Assert.NotNull(weak.Validation);
        Assert.True((await h.Service.ValidateTokenAsync(new ResetTokenRequest { Token = token })).Succeeded);
    }

    [Theory]
    [InlineData("indrapermana.jtk10+1@gmail.com", true, "indrapermana.jtk10@gmail.com")]
    [InlineData("indrapermana.jtk10+2@gmail.com", true, "indrapermana.jtk10@gmail.com")]
    [InlineData("indrapermana.jtk10+2@gmail.com", false, "indrapermana.jtk10+2@gmail.com")]
    [InlineData("plain@example.com", true, "plain@example.com")]
    public void RecipientResolver_RedirectsPlusAddressingOnlyWhenEnabled(string address, bool enabled, string expected)
    {
        Assert.Equal(expected, EmailRecipientResolver.Resolve(address, enabled));
    }
}
