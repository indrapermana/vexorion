namespace VexorionERP.Contracts;

public class ImportPreviewRowResponse
{
    public int RowNumber { get; set; }
    public Dictionary<string, string> Values { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}