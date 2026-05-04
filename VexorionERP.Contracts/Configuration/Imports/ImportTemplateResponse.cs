namespace VexorionERP.Contracts;

public class ImportTemplateResponse
{
    public string ImportType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/csv";
    public byte[] Content { get; set; } = [];
}
