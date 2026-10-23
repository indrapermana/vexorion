using System.Net;

namespace VexorionERP.Services;

public static class PasswordEmailTemplates
{
    private sealed record Copy(
        string ResetSubject, string ResetGreeting, string ResetIntro, string ResetButton, string ResetExpiry, string ResetIgnore,
        string ChangedSubject, string ChangedIntro, string ChangedWarning);

    private static readonly Dictionary<string, Copy> Locales = new()
    {
        ["en"] = new("Reset your Vexorion password", "Hello {0},", "We received a request to reset your password. Use the button below to choose a new one.",
            "Reset password", "This link expires in {0} minutes and can be used once.", "If you did not request this, you can ignore this email; your password stays the same.",
            "Your Vexorion password was changed", "Your password was just changed.", "If this was not you, contact your administrator immediately."),
        ["es"] = new("Restablece tu contraseña de Vexorion", "Hola {0},", "Recibimos una solicitud para restablecer tu contraseña. Usa el botón de abajo para elegir una nueva.",
            "Restablecer contraseña", "Este enlace caduca en {0} minutos y solo se puede usar una vez.", "Si no lo solicitaste, puedes ignorar este correo; tu contraseña no cambiará.",
            "Se cambió tu contraseña de Vexorion", "Tu contraseña se acaba de cambiar.", "Si no fuiste tú, contacta a tu administrador de inmediato."),
        ["id"] = new("Atur ulang kata sandi Vexorion Anda", "Halo {0},", "Kami menerima permintaan untuk mengatur ulang kata sandi Anda. Gunakan tombol di bawah untuk memilih kata sandi baru.",
            "Atur ulang kata sandi", "Tautan ini kedaluwarsa dalam {0} menit dan hanya dapat digunakan sekali.", "Jika Anda tidak memintanya, abaikan email ini; kata sandi Anda tidak berubah.",
            "Kata sandi Vexorion Anda telah diubah", "Kata sandi Anda baru saja diubah.", "Jika ini bukan Anda, segera hubungi administrator Anda.")
    };

    public static string NormalizeLocale(string? locale) =>
        locale is not null && Locales.ContainsKey(locale) ? locale : "en";

    public static EmailMessage PasswordReset(string to, string? locale, string displayName, string link, int expiresInMinutes)
    {
        var c = Locales[NormalizeLocale(locale)];
        var name = string.IsNullOrWhiteSpace(displayName) ? string.Empty : displayName;
        var greeting = string.Format(c.ResetGreeting, name).Replace("  ", " ").Replace(" ,", ",");
        var expiry = string.Format(c.ResetExpiry, expiresInMinutes);
        var html = $"<p>{WebUtility.HtmlEncode(greeting)}</p><p>{WebUtility.HtmlEncode(c.ResetIntro)}</p>"
            + $"<p><a href=\"{WebUtility.HtmlEncode(link)}\" style=\"display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none\">{WebUtility.HtmlEncode(c.ResetButton)}</a></p>"
            + $"<p>{WebUtility.HtmlEncode(expiry)}</p><p>{WebUtility.HtmlEncode(c.ResetIgnore)}</p>";
        var text = $"{greeting}\n\n{c.ResetIntro}\n{link}\n\n{expiry}\n{c.ResetIgnore}";
        return new EmailMessage(to, c.ResetSubject, html, text);
    }

    public static EmailMessage PasswordChanged(string to, string? locale, string displayName)
    {
        var c = Locales[NormalizeLocale(locale)];
        var greeting = string.Format(c.ResetGreeting, displayName ?? string.Empty).Replace("  ", " ").Replace(" ,", ",");
        var html = $"<p>{WebUtility.HtmlEncode(greeting)}</p><p>{WebUtility.HtmlEncode(c.ChangedIntro)}</p><p>{WebUtility.HtmlEncode(c.ChangedWarning)}</p>";
        var text = $"{greeting}\n\n{c.ChangedIntro}\n{c.ChangedWarning}";
        return new EmailMessage(to, c.ChangedSubject, html, text);
    }
}
