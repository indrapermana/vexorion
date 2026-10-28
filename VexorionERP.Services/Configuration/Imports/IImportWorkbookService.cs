using VexorionERP.Contracts;

namespace VexorionERP.Services;

public record ImportWorkbookRow(int RowNumber, Dictionary<string, string> Values);

public record ImportWorkbookReadResult(string SheetName, IReadOnlyCollection<string> Headers, IReadOnlyCollection<ImportWorkbookRow> Rows);

public record ImportErrorWorkbookResult(string FileName, string ContentType, byte[] Content);

public interface IImportWorkbookService
{
    ImportTemplateResponse BuildTemplate(string importType, IReadOnlyCollection<string> columns);

    ImportWorkbookReadResult ReadWorkbook(byte[] content);

    ImportErrorWorkbookResult BuildValidationErrorWorkbook(string importType, IReadOnlyCollection<ImportValidationErrorResponse> errors);
}
