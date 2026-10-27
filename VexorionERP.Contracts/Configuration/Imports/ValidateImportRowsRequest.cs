namespace VexorionERP.Contracts;

public class ValidateImportRowsRequest
{
    public string ImportType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Headers { get; set; } = [];
    public IReadOnlyCollection<ImportPreviewRowResponse> Rows { get; set; } = [];
}