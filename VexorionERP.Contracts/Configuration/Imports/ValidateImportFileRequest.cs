namespace VexorionERP.Contracts;

public class ValidateImportFileRequest
{
    public string ImportType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public byte[] FileContent { get; set; } = [];
}
