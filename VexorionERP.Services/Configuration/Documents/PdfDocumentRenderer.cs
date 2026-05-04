using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace VexorionERP.Services;

/// <summary>
/// Renders a <see cref="DocumentRenderModel"/> as a PDF byte array using QuestPDF.
/// Uses the Community license (free for commercial use up to $1M revenue / open-source).
/// </summary>
public static class PdfDocumentRenderer
{
    public static byte[] Render(DocumentRenderModel model)
    {
        return Document.Create(container => container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(2, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

            page.Header().Element(c => RenderHeader(c, model));
            page.Content().Element(c => RenderContent(c, model));
            page.Footer().AlignCenter().Text(x =>
            {
                x.Span("Page ");
                x.CurrentPageNumber();
                x.Span(" of ");
                x.TotalPages();
            });
        })).GeneratePdf();
    }

    // ─── Header ───────────────────────────────────────────────────────────────

    private static void RenderHeader(IContainer container, DocumentRenderModel m)
    {
        container.Column(col =>
        {
            col.Item().AlignCenter().Text(m.DocumentTitle)
                .Bold().FontSize(18);

            col.Item().AlignCenter()
                .Text($"No: {m.DocumentNumber}   |   Date: {m.DocumentDate:dd MMM yyyy}   |   {m.SecondaryDateLabel}: {m.SecondaryDate:dd MMM yyyy}   |   Currency: {m.CurrencyCode}")
                .FontSize(8);

            col.Item().PaddingTop(4).LineHorizontal(1);
        });
    }

    // ─── Content ──────────────────────────────────────────────────────────────

    private static void RenderContent(IContainer container, DocumentRenderModel m)
    {
        container.Column(col =>
        {
            // Parties
            col.Item().PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Element(c => RenderParty(c, m.FromParty));
                row.RelativeItem().Element(c => RenderParty(c, m.ToParty));
            });

            // Lines table
            col.Item().PaddingTop(16).Element(c => RenderLinesTable(c, m));

            // Totals
            col.Item().PaddingTop(8).Element(c => RenderTotals(c, m));

            // Notes
            if (!string.IsNullOrWhiteSpace(m.Notes))
            {
                col.Item().PaddingTop(12).Text($"Notes: {m.Notes}").Italic().FontSize(8);
            }
        });
    }

    // ─── Party block ─────────────────────────────────────────────────────────

    private static void RenderParty(IContainer container, DocumentPartyModel party)
    {
        container.Column(col =>
        {
            col.Item().Text(party.Label).Bold().FontSize(8);
            col.Item().Text(party.Name).Bold();
            if (!string.IsNullOrWhiteSpace(party.Address))
                col.Item().Text(party.Address!).FontSize(8);
            if (!string.IsNullOrWhiteSpace(party.Phone))
                col.Item().Text($"Tel: {party.Phone}").FontSize(8);
            if (!string.IsNullOrWhiteSpace(party.Email))
                col.Item().Text($"Email: {party.Email}").FontSize(8);
        });
    }

    // ─── Lines table ─────────────────────────────────────────────────────────

    private static void RenderLinesTable(IContainer container, DocumentRenderModel m)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(20);   // #
                cols.RelativeColumn(1.2f); // SKU
                cols.RelativeColumn(3);    // Product
                cols.RelativeColumn(0.8f); // Qty
                cols.RelativeColumn(0.8f); // Unit
                cols.RelativeColumn(1.2f); // Unit Price
                cols.RelativeColumn(1.2f); // Discount
                cols.RelativeColumn(1.0f); // Tax
                cols.RelativeColumn(1.4f); // Total
            });

            // Header
            static void Hdr(IContainer c, string t) =>
                c.Background(Colors.Grey.Lighten2).Padding(3)
                 .Text(t).Bold().FontSize(8);

            table.Header(h =>
            {
                h.Cell().Element(c => Hdr(c, "#"));
                h.Cell().Element(c => Hdr(c, "SKU"));
                h.Cell().Element(c => Hdr(c, "Product"));
                h.Cell().Element(c => Hdr(c, "Qty"));
                h.Cell().Element(c => Hdr(c, "Unit"));
                h.Cell().Element(c => Hdr(c, "Unit Price"));
                h.Cell().Element(c => Hdr(c, "Discount"));
                h.Cell().Element(c => Hdr(c, "Tax"));
                h.Cell().Element(c => Hdr(c, "Total"));
            });

            foreach (var line in m.Lines)
            {
                var bg = line.LineNumber % 2 == 0 ? Colors.Grey.Lighten4 : Colors.White;

                IContainer Cell(IContainer c) =>
                    c.Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).Padding(3);

                table.Cell().Element(Cell).Text(line.LineNumber.ToString()).FontSize(8);
                table.Cell().Element(Cell).Text(line.Sku).FontSize(8);
                table.Cell().Element(Cell).Text(line.ProductName).FontSize(8);
                table.Cell().Element(Cell).AlignRight().Text($"{line.Quantity:G}").FontSize(8);
                table.Cell().Element(Cell).Text(line.Unit).FontSize(8);
                table.Cell().Element(Cell).AlignRight().Text(FormatAmount(line.UnitPrice)).FontSize(8);
                table.Cell().Element(Cell).AlignRight()
                    .Text(line.DiscountAmount > 0 ? FormatAmount(line.DiscountAmount) : "-").FontSize(8);
                table.Cell().Element(Cell).AlignRight()
                    .Text(line.TaxAmount > 0 ? FormatAmount(line.TaxAmount) : "-").FontSize(8);
                table.Cell().Element(Cell).AlignRight().Text(FormatAmount(line.LineTotal)).FontSize(8).Bold();
            }
        });
    }

    // ─── Totals ───────────────────────────────────────────────────────────────

    private static void RenderTotals(IContainer container, DocumentRenderModel m)
    {
        container.AlignRight().Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(120);
                cols.ConstantColumn(80);
            });

            table.Cell().Padding(2).Text("Subtotal").FontSize(9);
            table.Cell().Padding(2).AlignRight().Text(FormatAmount(m.Subtotal)).FontSize(9);

            if (m.TaxTotal != 0)
            {
                table.Cell().Padding(2).Text("Tax").FontSize(9);
                table.Cell().Padding(2).AlignRight().Text(FormatAmount(m.TaxTotal)).FontSize(9);
            }

            table.Cell().ColumnSpan(2).LineHorizontal(1);

            table.Cell().Padding(2).Text("Grand Total").FontSize(9).Bold();
            table.Cell().Padding(2).AlignRight().Text(FormatAmount(m.GrandTotal)).FontSize(9).Bold();
        });
    }
    // ─── Formatting ───────────────────────────────────────────────────────────

    private static string FormatAmount(decimal value) => value.ToString("N2");
}
