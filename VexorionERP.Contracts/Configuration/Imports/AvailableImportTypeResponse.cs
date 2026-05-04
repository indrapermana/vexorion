namespace VexorionERP.Contracts;

public class AvailableImportTypeResponse
{
    public string ImportType { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Columns { get; set; } = [];
}
