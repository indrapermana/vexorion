using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseInvoiceCommandService : BaseCommandService<PurchaseInvoice>
{
    private readonly AppDbContext dbContext;
    private readonly INumberingService _numberingService;

    public PurchaseInvoiceCommandService(
        AppDbContext dbContext,
        ICurrentTenantProvider currentTenantProvider,
        INumberingService? numberingService = null) : base(currentTenantProvider)
    {
        this.dbContext = dbContext;
        _numberingService = numberingService ?? new NumberingService(dbContext, CurrentTenantProvider);
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> CreateAsync(CreatePurchaseInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<PurchaseInvoice>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> UpdateAsync(Guid purchaseInvoiceId, UpdatePurchaseInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        var result = await UpdateAsync(purchaseInvoiceId, (IUpdateInput<PurchaseInvoice>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default)
        => DeleteAsync(purchaseInvoiceId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<PurchaseInvoice>>> CreateAsync(ICreateInput<PurchaseInvoice> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var createRequest = (CreatePurchaseInvoiceRequest)request;

        PurchaseOrder? sourcePurchaseOrder = null;
        if (createRequest.SourcePurchaseOrderId.HasValue)
        {
            sourcePurchaseOrder = await context.PurchaseOrders.GetByTenant(tenantId.Value)
                .Include(x => x.Lines)
                .FirstOrDefaultAsync(
                    x => x.Id == createRequest.SourcePurchaseOrderId.Value,
                    cancellationToken);

            if (sourcePurchaseOrder is null)
                return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Source purchase order not found.");
        }

        var effectiveSupplierId = sourcePurchaseOrder?.SupplierId ?? createRequest.SupplierId;
        var effectiveCurrencyCode = sourcePurchaseOrder?.CurrencyCode ?? createRequest.CurrencyCode;

        var validation = Validate(createRequest.InvoiceNumber, effectiveSupplierId, effectiveCurrencyCode, requireInvoiceNumber: false);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.ValidationFailure(validation);

        if (!await context.Suppliers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == effectiveSupplierId, cancellationToken))
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");

        DateOnly dueDate = createRequest.DueDate;
        if (createRequest.PaymentTermId.HasValue)
        {
            var term = await context.PaymentTerms.FindAsync([createRequest.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = createRequest.InvoiceDate.AddDays(term.DaysDue);
        }

        var invoiceNumberResult = await ResolveInvoiceNumberAsync(createRequest.InvoiceNumber, createRequest.InvoiceDate, cancellationToken);
        if (!invoiceNumberResult.Succeeded)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(invoiceNumberResult.StatusCode ?? StatusCodes.Status400BadRequest, invoiceNumberResult.ErrorMessage ?? "Failed to generate invoice number.");

        var normalized = invoiceNumberResult.Value!;
        if (await context.PurchaseInvoices.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status409Conflict, "A purchase invoice with the same number already exists.");

        var invoice = createRequest.Adapt<PurchaseInvoice>();
        invoice.TenantId = tenantId.Value;
        invoice.InvoiceNumber = normalized;
        invoice.SupplierId = effectiveSupplierId;
        invoice.CurrencyCode = effectiveCurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(createRequest.Notes);
        invoice.VendorReferenceNumber = NormalizeOptional(createRequest.VendorReferenceNumber);
        invoice.Subtotal = 0m;
        invoice.TaxTotal = 0m;
        invoice.GrandTotal = 0m;
        invoice.PaidTotal = 0m;

        if (sourcePurchaseOrder is not null)
        {
            invoice.SourcePurchaseOrderId = sourcePurchaseOrder.Id;
            invoice.Lines = sourcePurchaseOrder.Lines
                .Where(x => x.IsActive)
                .Select(line => new PurchaseInvoiceLine
                {
                    TenantId = tenantId.Value,
                    PurchaseInvoiceId = invoice.Id,
                    ProductId = line.ProductId,
                    Quantity = line.Quantity,
                    UnitCost = line.UnitCost,
                    DiscountAmount = 0m,
                    TaxAmount = 0m,
                })
                .ToList();

            RecalcTotals(invoice);
        }

        context.PurchaseInvoices.Add(invoice);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<PurchaseInvoice>>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    public override async Task<ServiceResult<IEntityResponse<PurchaseInvoice>>> UpdateAsync(Guid purchaseInvoiceId, IUpdateInput<PurchaseInvoice> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var updateRequest = (UpdatePurchaseInvoiceRequest)request;

        var validation = Validate(updateRequest.InvoiceNumber, updateRequest.SupplierId, updateRequest.CurrencyCode, requireInvoiceNumber: true);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.ValidationFailure(validation);

        var invoice = await context.PurchaseInvoices.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "A posted or reversed invoice cannot be modified.");

        if (!await context.Suppliers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == updateRequest.SupplierId, cancellationToken))
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");

        DateOnly dueDate = updateRequest.DueDate;
        if (updateRequest.PaymentTermId.HasValue)
        {
            var term = await context.PaymentTerms.FindAsync([updateRequest.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = updateRequest.InvoiceDate.AddDays(term.DaysDue);
        }

        var normalized = updateRequest.InvoiceNumber.Trim().ToUpperInvariant();
        if (await context.PurchaseInvoices.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id != purchaseInvoiceId && x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<IEntityResponse<PurchaseInvoice>>.Failure(StatusCodes.Status409Conflict, "A purchase invoice with the same number already exists.");

        updateRequest.Adapt(invoice);
        invoice.InvoiceNumber = normalized;
        invoice.CurrencyCode = updateRequest.CurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(updateRequest.Notes);
        invoice.VendorReferenceNumber = NormalizeOptional(updateRequest.VendorReferenceNumber);
        RecalcTotals(invoice);

        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<PurchaseInvoice>>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseInvoiceId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await context.PurchaseInvoices.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status == InvoiceStatus.Cancelled || invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Only draft or unposted invoices can be deleted.");

        context.PurchaseInvoices.Remove(invoice);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> ApplyPaymentAsync(Guid purchaseInvoiceId, decimal amount, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        if (amount <= 0m)
        {
            return ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                ["Amount"] = ["Payment amount must be greater than zero."]
            });
        }

        var invoice = await dbContext.PurchaseInvoices.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status == InvoiceStatus.Draft || invoice.Status == InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = invoice.PaidTotal + amount;
        if (nextPaidTotal > invoice.GrandTotal)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        invoice.PaidTotal = nextPaidTotal;
        invoice.Status = nextPaidTotal == invoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    protected override IEntityResponse<PurchaseInvoice> BuildEntityResponse(PurchaseInvoice entity)
    {
        return entity.Adapt<PurchaseInvoiceDetailsResponse>();
    }

    protected override Task<PurchaseInvoice> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<PurchaseInvoice> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<PurchaseInvoice>(null!);
    }

    protected override Task<PurchaseInvoice> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<PurchaseInvoice>(null!);
    }

    internal static void RecalcTotals(PurchaseInvoice invoice)
    {
        invoice.Subtotal = invoice.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitCost) - x.DiscountAmount);
        invoice.TaxTotal = invoice.Lines.Where(x => x.IsActive).Sum(x => x.TaxAmount);
        invoice.GrandTotal = invoice.Subtotal + invoice.TaxTotal;
    }

    private async Task<ServiceResult<string>> ResolveInvoiceNumberAsync(string invoiceNumber, DateOnly invoiceDate, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(invoiceNumber) && !string.Equals(invoiceNumber.Trim(), "AUTO", StringComparison.OrdinalIgnoreCase))
            return ServiceResult<string>.Success(invoiceNumber.Trim().ToUpperInvariant());

        var nextNumber = await _numberingService.GenerateNextAsync("PURCHASE_INVOICE", invoiceDate, cancellationToken);
        if (!nextNumber.Succeeded)
            return ServiceResult<string>.Failure(nextNumber.StatusCode ?? StatusCodes.Status400BadRequest, nextNumber.ErrorMessage ?? "Failed to generate invoice number.");

        return ServiceResult<string>.Success(nextNumber.Value!);
    }

    private static Dictionary<string, string[]> Validate(string invoiceNumber, Guid supplierId, string currencyCode, bool requireInvoiceNumber)
    {
        var errors = new Dictionary<string, string[]>();
        if (requireInvoiceNumber && string.IsNullOrWhiteSpace(invoiceNumber)) errors[nameof(CreatePurchaseInvoiceRequest.InvoiceNumber)] = ["Invoice number is required."];
        if (supplierId == Guid.Empty) errors[nameof(CreatePurchaseInvoiceRequest.SupplierId)] = ["Supplier is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreatePurchaseInvoiceRequest.CurrencyCode)] = ["Currency code is required."];
        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ServiceResult<PurchaseInvoiceDetailsResponse> MapResult(ServiceResult<IEntityResponse<PurchaseInvoice>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseInvoiceDetailsResponse>();
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
