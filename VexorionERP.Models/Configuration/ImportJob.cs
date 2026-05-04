using VexorionERP.Models;

namespace VexorionERP.Models;

public class ImportJob : TenantEntityBase
{
    public string ImportType { get; set; } = string.Empty;
    public string SourceFileName { get; set; } = string.Empty;
    public string? SourceBlobPath { get; set; }
    public ImportJobStatus Status { get; set; } = ImportJobStatus.Draft;
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public Guid RequestedByUserId { get; set; }
    public DateTime? ValidatedAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? ErrorSummary { get; set; }
    public string? IdempotencyKey { get; set; }
}