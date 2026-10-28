using ClosedXML.Excel;
using VexorionERP.Contracts;

namespace VexorionERP.Services;

public class ImportWorkbookService : IImportWorkbookService
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public ImportTemplateResponse BuildTemplate(string importType, IReadOnlyCollection<string> columns)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Template");

        var columnIndex = 1;
        foreach (var column in columns)
        {
            var cell = sheet.Cell(1, columnIndex++);
            cell.Value = column;
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.LightGray;
        }

        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        var normalizedType = importType.Trim().ToLowerInvariant();
        return new ImportTemplateResponse
        {
            ImportType = normalizedType,
            FileName = $"{normalizedType}-template.xlsx",
            ContentType = XlsxContentType,
            Content = stream.ToArray(),
        };
    }

    public ImportWorkbookReadResult ReadWorkbook(byte[] content)
    {
        using var stream = new MemoryStream(content);
        using var workbook = new XLWorkbook(stream);

        var sheet = workbook.Worksheet(1);
        var firstRow = sheet.FirstRowUsed();
        if (firstRow is null)
        {
            return new ImportWorkbookReadResult(sheet.Name, [], []);
        }

        var lastColumn = sheet.LastColumnUsed()?.ColumnNumber() ?? 0;
        var headers = new List<string>(Math.Max(lastColumn, 0));
        for (var column = 1; column <= lastColumn; column++)
        {
            var value = firstRow.Cell(column).GetString().Trim();
            if (!string.IsNullOrWhiteSpace(value))
            {
                headers.Add(value);
            }
        }

        var rows = new List<ImportWorkbookRow>();
        var lastRowNumber = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var rowIndex = 2; rowIndex <= lastRowNumber; rowIndex++)
        {
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var hasData = false;

            for (var column = 1; column <= headers.Count; column++)
            {
                var value = sheet.Cell(rowIndex, column).GetString().Trim();
                values[headers[column - 1]] = value;
                if (!string.IsNullOrWhiteSpace(value))
                {
                    hasData = true;
                }
            }

            if (hasData)
            {
                rows.Add(new ImportWorkbookRow(rowIndex, values));
            }
        }

        return new ImportWorkbookReadResult(sheet.Name, headers, rows);
    }

    public ImportErrorWorkbookResult BuildValidationErrorWorkbook(string importType, IReadOnlyCollection<ImportValidationErrorResponse> errors)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("ValidationErrors");

        sheet.Cell(1, 1).Value = "SheetName";
        sheet.Cell(1, 2).Value = "RowNumber";
        sheet.Cell(1, 3).Value = "ColumnReference";
        sheet.Cell(1, 4).Value = "FieldName";
        sheet.Cell(1, 5).Value = "Cause";
        sheet.Cell(1, 6).Value = "SuggestedAction";
        sheet.Cell(1, 7).Value = "RetryAction";
        sheet.Range(1, 1, 1, 7).Style.Font.Bold = true;
        sheet.Range(1, 1, 1, 7).Style.Fill.BackgroundColor = XLColor.LightGray;

        var row = 2;
        foreach (var error in errors)
        {
            sheet.Cell(row, 1).Value = error.SheetName;
            sheet.Cell(row, 2).Value = error.RowNumber;
            sheet.Cell(row, 3).Value = error.ColumnReference;
            sheet.Cell(row, 4).Value = error.FieldName;
            sheet.Cell(row, 5).Value = error.Cause;
            sheet.Cell(row, 6).Value = error.SuggestedAction;
            sheet.Cell(row, 7).Value = error.RetryAction;
            row++;
        }

        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        var normalizedType = importType.Trim().ToLowerInvariant();
        return new ImportErrorWorkbookResult(
            FileName: $"{normalizedType}-validation-errors.xlsx",
            ContentType: XlsxContentType,
            Content: stream.ToArray());
    }
}
