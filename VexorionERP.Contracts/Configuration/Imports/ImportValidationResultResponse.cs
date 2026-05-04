using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ImportValidationResultResponse
{
    public Guid ImportJobId { get; set; }
    public string ImportType { get; set; } = string.Empty;
    public ImportJobStatus Status { get; set; }
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public string? ErrorWorkbookFileName { get; set; }
    public string? ErrorWorkbookContentType { get; set; }
    public byte[]? ErrorWorkbookContent { get; set; }
    public IReadOnlyCollection<ImportValidationErrorResponse> Errors { get; set; } = [];
}
