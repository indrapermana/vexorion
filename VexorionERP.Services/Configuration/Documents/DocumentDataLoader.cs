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
            GeneratedDocumentSourceType.CustomerPaymentReceipt => await LoadCustomerPaymentReceiptAsync(tenantId, sourceEntityId, cancellationToken),
            GeneratedDocumentSourceType.VendorPaymentReceipt => await LoadVendorPaymentReceiptAsync(tenantId, sourceEntityId, cancellationToken),
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
            FromParty = await LoadCompanyPartyAsync(tenantId, order.Warehouse?.Name, ct),
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
            FromParty = await LoadCompanyPartyAsync(tenantId, order.Warehouse?.Name, ct),
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
            FromParty = await LoadCompanyPartyAsync(tenantId, null, ct),
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
            ToParty = await LoadCompanyPartyAsync(tenantId, null, ct),
            Lines = lines,
            Subtotal = invoice.Subtotal,
            TaxTotal = invoice.TaxTotal,
            GrandTotal = invoice.GrandTotal,
            Notes = invoice.Notes,
        };
    }

    // ─── Customer Payment Receipt ──────────────────────────────────────────────

    private async Task<DocumentRenderModel> LoadCustomerPaymentReceiptAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var payment = await dbContext.CustomerPayments
            .AsNoTracking()
            .Include(p => p.Customer)
            .Include(p => p.SalesInvoice)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"CustomerPayment {id} not found for tenant {tenantId}.");

        var docNumber = payment.ReferenceNumber ?? payment.Id.ToString("N")[..8].ToUpperInvariant();
        var invoiceNumber = payment.SalesInvoice?.InvoiceNumber ?? string.Empty;
        var invoiceDate = payment.SalesInvoice?.InvoiceDate ?? payment.PaymentDate;

        var lines = new List<DocumentLineModel>
        {
            new(
                LineNumber: 1,
                Sku: string.Empty,
                ProductName: $"Payment for Invoice {invoiceNumber}" + (string.IsNullOrWhiteSpace(payment.PaymentMethod) ? string.Empty : $" via {payment.PaymentMethod}"),
                Quantity: 1,
                Unit: string.Empty,
                UnitPrice: payment.Amount,
                DiscountAmount: 0m,
                TaxAmount: 0m,
                LineTotal: payment.Amount)
        };

        return new DocumentRenderModel
        {
            DocumentTitle = "PAYMENT RECEIPT",
            DocumentNumber = docNumber,
            DocumentDate = payment.PaymentDate,
            SecondaryDateLabel = "Invoice Date",
            SecondaryDate = invoiceDate,
            CurrencyCode = payment.CurrencyCode,
            FromParty = await LoadCompanyPartyAsync(tenantId, null, ct),
            ToParty = new DocumentPartyModel(
                Label: "RECEIVED FROM",
                Name: payment.Customer?.Name ?? string.Empty,
                Address: payment.Customer?.BillingAddress,
                Phone: payment.Customer?.PhoneNumber,
                Email: payment.Customer?.Email),
            Lines = lines,
            Subtotal = payment.Amount,
            TaxTotal = 0m,
            GrandTotal = payment.Amount,
            Notes = payment.Notes,
        };
    }

    // ─── Vendor Payment Receipt ────────────────────────────────────────────────

    private async Task<DocumentRenderModel> LoadVendorPaymentReceiptAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var payment = await dbContext.VendorPayments
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.PurchaseInvoice)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"VendorPayment {id} not found for tenant {tenantId}.");

        var docNumber = payment.ReferenceNumber ?? payment.Id.ToString("N")[..8].ToUpperInvariant();
        var invoiceNumber = payment.PurchaseInvoice?.InvoiceNumber ?? string.Empty;
        var invoiceDate = payment.PurchaseInvoice?.InvoiceDate ?? payment.PaymentDate;

        var lines = new List<DocumentLineModel>
        {
            new(
                LineNumber: 1,
                Sku: string.Empty,
                ProductName: $"Payment for Invoice {invoiceNumber}" + (string.IsNullOrWhiteSpace(payment.PaymentMethod) ? string.Empty : $" via {payment.PaymentMethod}"),
                Quantity: 1,
                Unit: string.Empty,
                UnitPrice: payment.Amount,
                DiscountAmount: 0m,
                TaxAmount: 0m,
                LineTotal: payment.Amount)
        };

        return new DocumentRenderModel
        {
            DocumentTitle = "PAYMENT VOUCHER",
            DocumentNumber = docNumber,
            DocumentDate = payment.PaymentDate,
            SecondaryDateLabel = "Invoice Date",
            SecondaryDate = invoiceDate,
            CurrencyCode = payment.CurrencyCode,
            FromParty = await LoadCompanyPartyAsync(tenantId, null, ct),
            ToParty = new DocumentPartyModel(
                Label: "PAID TO",
                Name: payment.Supplier?.Name ?? string.Empty,
                Address: payment.Supplier?.Address,
                Phone: payment.Supplier?.PhoneNumber,
                Email: payment.Supplier?.Email),
            Lines = lines,
            Subtotal = payment.Amount,
            TaxTotal = 0m,
            GrandTotal = payment.Amount,
            Notes = payment.Notes,
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Loads the first active Company for the tenant and maps it to a FROM party.
    /// Falls back to the warehouse/location hint if no company record exists.
    /// </summary>
    private async Task<DocumentPartyModel> LoadCompanyPartyAsync(Guid tenantId, string? locationHint, CancellationToken ct)
    {
        var company = await dbContext.Companies
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.IsActive)
            .OrderBy(c => c.Code)
            .FirstOrDefaultAsync(ct);

        if (company is null)
        {
            return new DocumentPartyModel(Label: "FROM", Name: locationHint ?? "Your Company", Address: null, Phone: null, Email: null);
        }

        var addressParts = new[]
        {
            company.AddressLine1,
            company.AddressLine2,
            company.City,
            company.State,
            company.PostalCode,
            company.Country,
        }.Where(p => !string.IsNullOrWhiteSpace(p));

        var address = string.Join(", ", addressParts);
        if (!string.IsNullOrWhiteSpace(locationHint))
            address = string.IsNullOrWhiteSpace(address) ? locationHint : $"{address} ({locationHint})";

        return new DocumentPartyModel(
            Label: "FROM",
            Name: company.Name,
            Address: string.IsNullOrWhiteSpace(address) ? null : address,
            Phone: company.PhoneNumber,
            Email: company.Email);
    }
}

