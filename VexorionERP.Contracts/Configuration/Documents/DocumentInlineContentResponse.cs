namespace VexorionERP.Contracts;

public class DocumentInlineContentResponse
{
    public Guid GeneratedDocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public byte[] Content { get; set; } = [];
}
