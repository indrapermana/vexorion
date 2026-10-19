namespace VexorionERP.Services;

public sealed class DocumentSecurityOptions
{
    public const string SectionName = "DocumentSecurity";

    public long AbsoluteMaxFileSizeBytes { get; set; } = 100L * 1024 * 1024;
    public bool RequireMalwareScan { get; set; }
    public ClamAvOptions ClamAv { get; set; } = new();
}

public sealed class ClamAvOptions
{
    public bool Enabled { get; set; }
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 3310;
    public int TimeoutSeconds { get; set; } = 30;
}
