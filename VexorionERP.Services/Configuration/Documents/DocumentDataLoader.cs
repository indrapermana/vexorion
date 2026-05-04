using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

/// <summary>
/// Loads entity data from the database and maps it to the canonical <see cref="DocumentRenderModel"/>
/// used by both the DOCX and PDF renderers.
/// </summary>
public sealed class DocumentDataLoader(AppDbContext dbContext)
{
    public async Task<DocumentRenderModel> LoadAsync(
        Guid tenantId,
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        CancellationToken cancellationToken)
    {
        return sourceType switch
        {
            GeneratedDocumentSourceType.SalesOrder => await LoadSalesOrderAsync(tenantId, sourceEntityId, cancellationToken),
            GeneratedDocumentSourceType.PurchaseOrder => await LoadPurchaseOrderAsync(tenantId, sourceEntityId, cancellationToken),
            GeneratedDocumentSourceType.SalesInvoice => await LoadSalesInvoiceAsync(tenantId, sourceEntityId, cancellationToken),
            GeneratedDocumentSourceType.PurchaseInvoice => await LoadPurchaseInvoiceAsync(tenantId, sourceEntityId, cancellationToken),
            _ => throw new NotSupportedException($"Document source type '{sourceType}' is not supported by the renderer.")
        };
    }

    // ─── Sales Order ─────────────────────────────────────────────────────────

    private async Task<DocumentRenderModel> LoadSalesOrderAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var order = await dbContext.SalesOrders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Warehouse)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"SalesOrder {id} not found for tenant {tenantId}.");

        var lines = order.Lines.OrderBy(l => l.CreatedAtUtc).Select((l, i) => new DocumentLineModel(
            LineNumber: i + 1,
            Sku: l.Product?.Sku ?? string.Empty,
            ProductName: l.Product?.Name ?? string.Empty,
            Quantity: l.Quantity,
            Unit: l.Product?.UnitOfMeasure ?? string.Empty,
            UnitPrice: l.UnitPrice,
            DiscountAmount: l.DiscountAmount,
            TaxAmount: 0m,
            LineTotal: l.LineTotal)).ToList();

        var subtotal = lines.Sum(l => l.LineTotal);

        return new DocumentRenderModel
        {
            DocumentTitle = "SALES ORDER",
            DocumentNumber = order.OrderNumber,
            DocumentDate = order.OrderDate,
            SecondaryDateLabel = "Required Date",
            SecondaryDate = order.RequiredDate,
            CurrencyCode = order.CurrencyCode,
            FromParty = CompanyParty(order.Warehouse?.Name ?? "Warehouse"),
            ToParty = new DocumentPartyModel(
                Label: "BILL TO",
                Name: order.Customer?.Name ?? string.Empty,
                Address: order.Customer?.BillingAddress,
                Phone: order.Customer?.PhoneNumber,
                Email: order.Customer?.Email),
            Lines = lines,
            Subtotal = subtotal,
            TaxTotal = 0m,
            GrandTotal = subtotal,
            Notes = order.Notes,
        };
    }

    // ─── Purchase Order ───────────────────────────────────────────────────────

    private async Task<DocumentRenderModel> LoadPurchaseOrderAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var order = await dbContext.PurchaseOrders
            .AsNoTracking()
            .Include(o => o.Supplier)
            .Include(o => o.Warehouse)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"PurchaseOrder {id} not found for tenant {tenantId}.");

        var lines = order.Lines.OrderBy(l => l.CreatedAtUtc).Select((l, i) => new DocumentLineModel(
            LineNumber: i + 1,
            Sku: l.Product?.Sku ?? string.Empty,
            ProductName: l.Product?.Name ?? string.Empty,
            Quantity: l.Quantity,
            Unit: l.Product?.UnitOfMeasure ?? string.Empty,
            UnitPrice: l.UnitCost,
            DiscountAmount: 0m,
            TaxAmount: 0m,
            LineTotal: l.LineTotal)).ToList();

        var subtotal = lines.Sum(l => l.LineTotal);

        return new DocumentRenderModel
        {
            DocumentTitle = "PURCHASE ORDER",
            DocumentNumber = order.OrderNumber,
            DocumentDate = order.OrderDate,
            SecondaryDateLabel = "Expected Receipt",
            SecondaryDate = order.ExpectedReceiptDate,
            CurrencyCode = order.CurrencyCode,
            FromParty = CompanyParty(order.Warehouse?.Name ?? "Warehouse"),
            ToParty = new DocumentPartyModel(
                Label: "SUPPLIER",
                Name: order.Supplier?.Name ?? string.Empty,
                Address: order.Supplier?.Address,
                Phone: order.Supplier?.PhoneNumber,
                Email: order.Supplier?.Email),
            Lines = lines,
            Subtotal = subtotal,
            TaxTotal = 0m,
            GrandTotal = subtotal,
            Notes = order.Notes,
        };
    }

    // ─── Sales Invoice ────────────────────────────────────────────────────────

    private async Task<DocumentRenderModel> LoadSalesInvoiceAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var invoice = await dbContext.SalesInvoices
            .AsNoTracking()
            .Include(i => i.Customer)
            .Include(i => i.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(i => i.Id == id && i.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"SalesInvoice {id} not found for tenant {tenantId}.");

        var lines = invoice.Lines.OrderBy(l => l.CreatedAtUtc).Select((l, i) => new DocumentLineModel(
            LineNumber: i + 1,
            Sku: l.Product?.Sku ?? string.Empty,
            ProductName: l.Product?.Name ?? string.Empty,
            Quantity: l.Quantity,
            Unit: l.Product?.UnitOfMeasure ?? string.Empty,
            UnitPrice: l.UnitPrice,
            DiscountAmount: l.DiscountAmount,
            TaxAmount: l.TaxAmount,
            LineTotal: l.LineTotal)).ToList();

        return new DocumentRenderModel
        {
            DocumentTitle = "SALES INVOICE",
            DocumentNumber = invoice.InvoiceNumber,
            DocumentDate = invoice.InvoiceDate,
            SecondaryDateLabel = "Due Date",
            SecondaryDate = invoice.DueDate,
            CurrencyCode = invoice.CurrencyCode,
            FromParty = CompanyParty("Vexorion ERP"),
            ToParty = new DocumentPartyModel(
                Label: "BILL TO",
                Name: invoice.Customer?.Name ?? string.Empty,
                Address: invoice.Customer?.BillingAddress,
                Phone: invoice.Customer?.PhoneNumber,
                Email: invoice.Customer?.Email),
            Lines = lines,
            Subtotal = invoice.Subtotal,
            TaxTotal = invoice.TaxTotal,
            GrandTotal = invoice.GrandTotal,
            Notes = invoice.Notes,
        };
    }

    // ─── Purchase Invoice ─────────────────────────────────────────────────────

    private async Task<DocumentRenderModel> LoadPurchaseInvoiceAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var invoice = await dbContext.PurchaseInvoices
            .AsNoTracking()
            .Include(i => i.Supplier)
            .Include(i => i.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(i => i.Id == id && i.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"PurchaseInvoice {id} not found for tenant {tenantId}.");

        var lines = invoice.Lines.OrderBy(l => l.CreatedAtUtc).Select((l, i) => new DocumentLineModel(
            LineNumber: i + 1,
            Sku: l.Product?.Sku ?? string.Empty,
            ProductName: l.Product?.Name ?? string.Empty,
            Quantity: l.Quantity,
            Unit: l.Product?.UnitOfMeasure ?? string.Empty,
            UnitPrice: l.UnitCost,
            DiscountAmount: l.DiscountAmount,
            TaxAmount: l.TaxAmount,
            LineTotal: l.LineTotal)).ToList();

        return new DocumentRenderModel
        {
            DocumentTitle = "PURCHASE INVOICE",
            DocumentNumber = invoice.InvoiceNumber,
            DocumentDate = invoice.InvoiceDate,
            SecondaryDateLabel = "Due Date",
            SecondaryDate = invoice.DueDate,
            CurrencyCode = invoice.CurrencyCode,
            FromParty = new DocumentPartyModel(
                Label: "FROM",
                Name: invoice.Supplier?.Name ?? string.Empty,
                Address: invoice.Supplier?.Address,
                Phone: invoice.Supplier?.PhoneNumber,
                Email: invoice.Supplier?.Email),
            ToParty = CompanyParty("Vexorion ERP"),
            Lines = lines,
            Subtotal = invoice.Subtotal,
            TaxTotal = invoice.TaxTotal,
            GrandTotal = invoice.GrandTotal,
            Notes = invoice.Notes,
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static DocumentPartyModel CompanyParty(string locationHint) =>
        new(Label: "FROM", Name: "Vexorion ERP", Address: locationHint, Phone: null, Email: null);
}
