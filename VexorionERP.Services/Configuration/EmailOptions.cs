namespace VexorionERP;

public class EmailOptions
{
    public const string SectionName = "Email";

    public string ResendApiKey { get; set; } = string.Empty;
    public string FromAddress { get; set; } = "noreply@mail.indesyakaryadigital.com";
    public string FromName { get; set; } = "Vexorion";
    public string MainUiBaseUrl { get; set; } = string.Empty;
    public int PasswordResetMinutes { get; set; } = 15;

    // Development helper: delivers "name+tag@host" mail to "name@host" so one inbox can serve many test users.
    public bool RedirectPlusAddressing { get; set; }
}
