namespace VexorionERP.Contracts;

public class ImportValidationErrorResponse
{
    public string SheetName { get; set; } = string.Empty;
    public int RowNumber { get; set; }
    public string ColumnReference { get; set; } = string.Empty;
    public string ColumnName { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Cause { get; set; } = string.Empty;
    public string SuggestedAction { get; set; } = string.Empty;
    public string RetryAction { get; set; } = string.Empty;
}
