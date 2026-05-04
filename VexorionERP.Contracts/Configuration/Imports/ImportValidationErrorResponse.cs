namespace VexorionERP.Contracts;

public class ImportValidationErrorResponse
{
    public int RowNumber { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
