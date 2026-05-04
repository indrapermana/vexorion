using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace VexorionERP.Services;

/// <summary>
/// Renders a <see cref="DocumentRenderModel"/> as a DOCX byte array using the Open XML SDK.
/// Layout: header block → party block → line-items table → totals table → notes.
/// </summary>
public static class DocxDocumentRenderer
{
    public static byte[] Render(DocumentRenderModel model)
    {
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document(BuildBody(model));
            mainPart.Document.Save();
        }
        return ms.ToArray();
    }

    // ─── Body ─────────────────────────────────────────────────────────────────

    private static Body BuildBody(DocumentRenderModel m)
    {
        var body = new Body();

        body.Append(TitleParagraph(m.DocumentTitle));
        body.Append(MetaParagraph($"No: {m.DocumentNumber}   Date: {m.DocumentDate:dd MMM yyyy}   {m.SecondaryDateLabel}: {m.SecondaryDate:dd MMM yyyy}   Currency: {m.CurrencyCode}"));
        body.Append(EmptyParagraph());

        body.Append(PartiesTable(m));
        body.Append(EmptyParagraph());

        body.Append(LinesTable(m));
        body.Append(EmptyParagraph());

        body.Append(TotalsTable(m));

        if (!string.IsNullOrWhiteSpace(m.Notes))
        {
            body.Append(EmptyParagraph());
            body.Append(NotesParagraph(m.Notes!));
        }

        body.Append(new SectionProperties());
        return body;
    }

    // ─── Title ────────────────────────────────────────────────────────────────

    private static Paragraph TitleParagraph(string title) =>
        new(new ParagraphProperties(
                new Justification { Val = JustificationValues.Center }),
            new Run(
                new RunProperties(
                    new Bold(),
                    new FontSize { Val = "36" }),
                new Text(title)));

    private static Paragraph MetaParagraph(string text) =>
        new(new ParagraphProperties(
                new Justification { Val = JustificationValues.Center }),
            new Run(new Text(text)));

    private static Paragraph EmptyParagraph() => new(new Run(new Text(string.Empty)));

    private static Paragraph NotesParagraph(string notes) =>
        new(new Run(
            new RunProperties(new Italic()),
            new Text($"Notes: {notes}")));

    // ─── Parties ──────────────────────────────────────────────────────────────

    private static Table PartiesTable(DocumentRenderModel m)
    {
        var table = new Table(BorderlessTableProperties());

        var row = new TableRow();
        row.Append(PartyCell(m.FromParty));
        row.Append(PartyCell(m.ToParty));
        table.Append(row);
        return table;
    }

    private static TableCell PartyCell(DocumentPartyModel party)
    {
        var cell = new TableCell(CellWidth(50));
        cell.Append(BoldParagraph(party.Label));
        cell.Append(PlainParagraph(party.Name));
        if (!string.IsNullOrWhiteSpace(party.Address))
            cell.Append(PlainParagraph(party.Address!));
        if (!string.IsNullOrWhiteSpace(party.Phone))
            cell.Append(PlainParagraph($"Tel: {party.Phone}"));
        if (!string.IsNullOrWhiteSpace(party.Email))
            cell.Append(PlainParagraph($"Email: {party.Email}"));
        return cell;
    }

    // ─── Lines table ──────────────────────────────────────────────────────────

    private static Table LinesTable(DocumentRenderModel m)
    {
        var table = new Table(BorderedTableProperties());

        table.Append(LinesHeaderRow());

        foreach (var line in m.Lines)
        {
            var row = new TableRow();
            row.Append(DataCell(line.LineNumber.ToString(), 5));
            row.Append(DataCell(line.Sku, 10));
            row.Append(DataCell(line.ProductName, 35));
            row.Append(DataCell($"{line.Quantity:G}", 8));
            row.Append(DataCell(line.Unit, 7));
            row.Append(DataCell(FormatAmount(line.UnitPrice), 10, JustificationValues.Right));
            row.Append(DataCell(line.DiscountAmount > 0 ? FormatAmount(line.DiscountAmount) : "-", 10, JustificationValues.Right));
            row.Append(DataCell(line.TaxAmount > 0 ? FormatAmount(line.TaxAmount) : "-", 10, JustificationValues.Right));
            row.Append(DataCell(FormatAmount(line.LineTotal), 15, JustificationValues.Right));
            table.Append(row);
        }

        return table;
    }

    private static TableRow LinesHeaderRow()
    {
        var row = new TableRow();
        row.Append(HeaderCell("#", 5));
        row.Append(HeaderCell("SKU", 10));
        row.Append(HeaderCell("Product", 35));
        row.Append(HeaderCell("Qty", 8));
        row.Append(HeaderCell("Unit", 7));
        row.Append(HeaderCell("Unit Price", 10, JustificationValues.Right));
        row.Append(HeaderCell("Discount", 10, JustificationValues.Right));
        row.Append(HeaderCell("Tax", 10, JustificationValues.Right));
        row.Append(HeaderCell("Total", 15, JustificationValues.Right));
        return row;
    }

    // ─── Totals ───────────────────────────────────────────────────────────────

    private static Table TotalsTable(DocumentRenderModel m)
    {
        var table = new Table(BorderlessTableProperties());
        table.Append(TotalsRow("Subtotal", FormatAmount(m.Subtotal)));
        if (m.TaxTotal != 0)
            table.Append(TotalsRow("Tax", FormatAmount(m.TaxTotal)));
        table.Append(TotalsRow("Grand Total", FormatAmount(m.GrandTotal), bold: true));
        return table;
    }

    private static TableRow TotalsRow(string label, string value, bool bold = false)
    {
        var row = new TableRow();
        // Spacer occupying the left 70%
        row.Append(SpacerCell(70));

        var labelCell = new TableCell(CellWidth(15));
        labelCell.Append(bold ? BoldParagraph(label) : PlainParagraph(label));
        row.Append(labelCell);

        var valueCell = new TableCell(CellWidth(15));
        var valueRun = bold
            ? new Run(new RunProperties(new Bold()), new Text(value))
            : new Run(new Text(value));
        valueCell.Append(new Paragraph(
            new ParagraphProperties(new Justification { Val = JustificationValues.Right }),
            valueRun));
        row.Append(valueCell);

        return row;
    }

    // ─── Table properties helpers ─────────────────────────────────────────────

    private static TableProperties BorderedTableProperties() => new(
        new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct },
        new TableBorders(
            new TopBorder { Val = BorderValues.Single, Size = 4 },
            new BottomBorder { Val = BorderValues.Single, Size = 4 },
            new LeftBorder { Val = BorderValues.Single, Size = 4 },
            new RightBorder { Val = BorderValues.Single, Size = 4 },
            new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4 },
            new InsideVerticalBorder { Val = BorderValues.Single, Size = 4 }));

    private static TableProperties BorderlessTableProperties() => new(
        new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct });

    private static TableCellProperties CellWidth(int pctTenths) => new(
        new TableCellWidth { Width = pctTenths.ToString(), Type = TableWidthUnitValues.Pct });

    // ─── Cell helpers ─────────────────────────────────────────────────────────

    private static TableCell HeaderCell(string text, int widthPct, JustificationValues? justify = null)
    {
        var cell = new TableCell(CellWidth(widthPct));
        cell.Append(new Paragraph(
            new ParagraphProperties(new Justification { Val = justify ?? JustificationValues.Left }),
            new Run(new RunProperties(new Bold()), new Text(text))));
        return cell;
    }

    private static TableCell DataCell(string text, int widthPct, JustificationValues? justify = null)
    {
        var cell = new TableCell(CellWidth(widthPct));
        cell.Append(new Paragraph(
            new ParagraphProperties(new Justification { Val = justify ?? JustificationValues.Left }),
            new Run(new Text(text))));
        return cell;
    }

    private static TableCell SpacerCell(int widthPct)
    {
        var cell = new TableCell(CellWidth(widthPct));
        cell.Append(new Paragraph(new Run(new Text(string.Empty))));
        return cell;
    }

    // ─── Paragraph helpers ────────────────────────────────────────────────────

    private static Paragraph BoldParagraph(string text) =>
        new(new Run(new RunProperties(new Bold()), new Text(text)));

    private static Paragraph PlainParagraph(string text) =>
        new(new Run(new Text(text)));

    // ─── Number formatting ────────────────────────────────────────────────────

    private static string FormatAmount(decimal value) => value.ToString("N2");
}
