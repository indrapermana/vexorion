using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace VexorionERP.Services;

public sealed class ResendEmailSender(
    HttpClient httpClient,
    IOptions<EmailOptions> options,
    ILogger<ResendEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ResendApiKey))
        {
            logger.LogWarning("Email not sent: Email:ResendApiKey is not configured.");
            return;
        }

        var recipient = EmailRecipientResolver.Resolve(message.To, settings.RedirectPlusAddressing);
        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Content = JsonContent.Create(new
            {
                from = string.IsNullOrWhiteSpace(settings.FromName) ? settings.FromAddress : $"{settings.FromName} <{settings.FromAddress}>",
                to = new[] { recipient },
                subject = message.Subject,
                html = message.HtmlBody,
                text = message.TextBody
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ResendApiKey);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError(
                "Resend rejected an email with HTTP status {StatusCode} (from {FromAddress}): {Detail}",
                (int)response.StatusCode,
                settings.FromAddress,
                detail.Length > 500 ? detail[..500] : detail);
            throw new InvalidOperationException($"Email delivery failed with HTTP status {(int)response.StatusCode}.");
        }
    }
}
