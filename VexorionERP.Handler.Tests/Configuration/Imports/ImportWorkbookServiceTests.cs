using ClosedXML.Excel;
using VexorionERP.Contracts;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Configuration.Imports;

public class ImportWorkbookServiceTests
{
    [Fact]
    public void ReadWorkbook_PreservesWorksheetName()
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Customers 2026");
        sheet.Cell(1, 1).Value = "CustomerNumber";
        sheet.Cell(2, 1).Value = "C-001";
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        var result = new ImportWorkbookService().ReadWorkbook(stream.ToArray());

        Assert.Equal("Customers 2026", result.SheetName);
        Assert.Equal("C-001", Assert.Single(result.Rows).Values["CustomerNumber"]);
    }

    [Fact]
    public void BuildValidationErrorWorkbook_ContainsActionableLocationAndRetryColumns()
    {
        var result = new ImportWorkbookService().BuildValidationErrorWorkbook(
            "customer",
            [new ImportValidationErrorResponse
            {
                SheetName = "Customers",
                RowNumber = 2,
                ColumnReference = "C",
                ColumnName = "Email",
                FieldName = "Email",
                Category = "TypeConversion",
                Message = "Email is invalid.",
                Cause = "The email address is not valid.",
                SuggestedAction = "Enter a complete email address.",
                RetryAction = "edit-and-revalidate",
            }]);

        using var stream = new MemoryStream(result.Content);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheet("ValidationErrors");

        Assert.Equal("SheetName", sheet.Cell(1, 1).GetString());
        Assert.Equal("RetryAction", sheet.Cell(1, 7).GetString());
        Assert.Equal("Customers", sheet.Cell(2, 1).GetString());
        Assert.Equal("C", sheet.Cell(2, 3).GetString());
        Assert.Equal("Email", sheet.Cell(2, 4).GetString());
        Assert.Equal("The email address is not valid.", sheet.Cell(2, 5).GetString());
        Assert.Equal("Enter a complete email address.", sheet.Cell(2, 6).GetString());
        Assert.Equal("edit-and-revalidate", sheet.Cell(2, 7).GetString());
    }
}
