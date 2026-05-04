using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ImportJobStatusResponse
{
    public Guid ImportJobId { get; set; }
    public string ImportType { get; set; } = string.Empty;
    public ImportJobStatus Status { get; set; }
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public DateTime? ValidatedAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? ErrorSummary { get; set; }
}
