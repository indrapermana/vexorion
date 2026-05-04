namespace VexorionERP.Services;

/// <summary>
/// Canonical data model passed to both DOCX and PDF renderers.
/// Populated by DocumentDataLoader from EF entities before rendering begins.
/// </summary>
public sealed record DocumentRenderModel
{
    /// <summary>Document title shown in the header (e.g. "SALES ORDER", "PURCHASE INVOICE").</summary>
    public required string DocumentTitle { get; init; }

    /// <summary>Reference number (e.g. SO-2026-0001).</summary>
    public required string DocumentNumber { get; init; }

    /// <summary>Primary document date.</summary>
    public required DateOnly DocumentDate { get; init; }

    /// <summary>Secondary date (Required Date, Expected Receipt Date, Due Date).</summary>
    public required string SecondaryDateLabel { get; init; }
    public required DateOnly SecondaryDate { get; init; }

    /// <summary>ISO 4217 currency code.</summary>
    public required string CurrencyCode { get; init; }

    public required DocumentPartyModel FromParty { get; init; }
    public required DocumentPartyModel ToParty { get; init; }

    public required IReadOnlyList<DocumentLineModel> Lines { get; init; }

    public required decimal Subtotal { get; init; }
    public required decimal TaxTotal { get; init; }
    public required decimal GrandTotal { get; init; }

    public string? Notes { get; init; }
}

public sealed record DocumentPartyModel(
    string Label,          // "FROM" or "TO" or "BILL TO"
    string Name,
    string? Address,
    string? Phone,
    string? Email);

public sealed record DocumentLineModel(
    int LineNumber,
    string Sku,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal LineTotal);
