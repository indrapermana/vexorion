using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class GeneratedDocumentResponse
{
    public Guid GeneratedDocumentId { get; set; }
    public GeneratedDocumentSourceType SourceType { get; set; }
    public Guid SourceEntityId { get; set; }
    public GeneratedDocumentFormat Format { get; set; }
    public GeneratedDocumentStatus Status { get; set; }
    public int Version { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string BlobPath { get; set; } = string.Empty;
    public string? DownloadUrl { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
}
