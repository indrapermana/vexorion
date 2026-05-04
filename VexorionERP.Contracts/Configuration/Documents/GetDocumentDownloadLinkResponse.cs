namespace VexorionERP.Contracts;

public class GetDocumentDownloadLinkResponse
{
    public Guid GeneratedDocumentId { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
}
