using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesInvoiceCommandService : BaseCommandService<SalesInvoice>
{
    private readonly AppDbContext dbContext;
    private readonly INumberingService _numberingService;

    public SalesInvoiceCommandService(
        AppDbContext dbContext,
        ICurrentTenantProvider currentTenantProvider,
        INumberingService? numberingService = null) : base(currentTenantProvider)
    {
        this.dbContext = dbContext;
        _numberingService = numberingService ?? new NumberingService(dbContext, CurrentTenantProvider);
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> CreateAsync(CreateSalesInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<SalesInvoice>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> UpdateAsync(Guid salesInvoiceId, UpdateSalesInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        var result = await UpdateAsync(salesInvoiceId, (IUpdateInput<SalesInvoice>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
        => DeleteAsync(salesInvoiceId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<SalesInvoice>>> CreateAsync(ICreateInput<SalesInvoice> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var createRequest = (CreateSalesInvoiceRequest)request;

        SalesOrder? sourceSalesOrder = null;
        if (createRequest.SourceSalesOrderId.HasValue)
        {
            sourceSalesOrder = await context.SalesOrders.GetByTenant(tenantId.Value)
                .Include(x => x.Lines)
                .FirstOrDefaultAsync(x => x.Id == createRequest.SourceSalesOrderId.Value, cancellationToken);

            if (sourceSalesOrder is null)
                return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Source sales order not found.");
        }

        var effectiveCustomerId = sourceSalesOrder?.CustomerId ?? createRequest.CustomerId;
        var effectiveCurrencyCode = sourceSalesOrder?.CurrencyCode ?? createRequest.CurrencyCode;

        var validation = Validate(createRequest.InvoiceNumber, effectiveCustomerId, effectiveCurrencyCode, requireInvoiceNumber: false);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<SalesInvoice>>.ValidationFailure(validation);

        if (!await context.Customers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == effectiveCustomerId, cancellationToken))
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");

        DateOnly dueDate = createRequest.DueDate;
        if (createRequest.PaymentTermId.HasValue)
        {
            var term = await context.PaymentTerms.FindAsync([createRequest.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = createRequest.InvoiceDate.AddDays(term.DaysDue);
        }

        var invoiceNumberResult = await ResolveInvoiceNumberAsync(createRequest.InvoiceNumber, createRequest.InvoiceDate, cancellationToken);
        if (!invoiceNumberResult.Succeeded)
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(invoiceNumberResult.StatusCode ?? StatusCodes.Status400BadRequest, invoiceNumberResult.ErrorMessage ?? "Failed to generate invoice number.");

        var normalized = invoiceNumberResult.Value!;
        if (await context.SalesInvoices.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status409Conflict, "A sales invoice with the same number already exists.");

        var invoice = createRequest.Adapt<SalesInvoice>();
        invoice.TenantId = tenantId.Value;
        invoice.InvoiceNumber = normalized;
        invoice.CustomerId = effectiveCustomerId;
        invoice.CurrencyCode = effectiveCurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(createRequest.Notes);
        invoice.Subtotal = 0m;
        invoice.TaxTotal = 0m;
        invoice.GrandTotal = 0m;
        invoice.PaidTotal = 0m;

        if (sourceSalesOrder is not null)
        {
            invoice.SourceSalesOrderId = sourceSalesOrder.Id;
            invoice.Lines = sourceSalesOrder.Lines
                .Where(x => x.IsActive)
                .Select(line => new SalesInvoiceLine
                {
                    TenantId = tenantId.Value,
                    SalesInvoiceId = invoice.Id,
                    ProductId = line.ProductId,
                    Quantity = line.Quantity,
                    UnitPrice = line.UnitPrice,
                    DiscountAmount = line.DiscountAmount,
                    TaxAmount = 0m,
                })
                .ToList();

            RecalcTotals(invoice);
        }

        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<SalesInvoice>>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public override async Task<ServiceResult<IEntityResponse<SalesInvoice>>> UpdateAsync(Guid salesInvoiceId, IUpdateInput<SalesInvoice> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var updateRequest = (UpdateSalesInvoiceRequest)request;

        var validation = Validate(updateRequest.InvoiceNumber, updateRequest.CustomerId, updateRequest.CurrencyCode, requireInvoiceNumber: true);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<SalesInvoice>>.ValidationFailure(validation);

        var invoice = await context.SalesInvoices.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "A posted or reversed invoice cannot be modified.");

        if (!await context.Customers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == updateRequest.CustomerId, cancellationToken))
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");

        DateOnly dueDate = updateRequest.DueDate;
        if (updateRequest.PaymentTermId.HasValue)
        {
            var term = await context.PaymentTerms.FindAsync([updateRequest.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = updateRequest.InvoiceDate.AddDays(term.DaysDue);
        }

        var normalized = updateRequest.InvoiceNumber.Trim().ToUpperInvariant();
        if (await context.SalesInvoices.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id != salesInvoiceId && x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<IEntityResponse<SalesInvoice>>.Failure(StatusCodes.Status409Conflict, "A sales invoice with the same number already exists.");

        updateRequest.Adapt(invoice);
        invoice.InvoiceNumber = normalized;
        invoice.CurrencyCode = updateRequest.CurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(updateRequest.Notes);
        RecalcTotals(invoice);

        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<SalesInvoice>>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await context.SalesInvoices.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status == InvoiceStatus.Cancelled || invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Only draft or unposted invoices can be deleted.");

        context.SalesInvoices.Remove(invoice);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> CreateCreditNoteAsync(Guid originalInvoiceId, CreateCreditNoteRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var original = await dbContext.SalesInvoices.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == originalInvoiceId, cancellationToken);

        if (original is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (original.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "A credit note can only be issued for a posted or paid invoice.");

        if (original.CreditNoteOfInvoiceId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "A credit note cannot be created for another credit note.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var creditNoteNumberResult = await ResolveInvoiceNumberAsync(request.CreditNoteNumber ?? string.Empty, today, cancellationToken);
        if (!creditNoteNumberResult.Succeeded)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(creditNoteNumberResult.StatusCode ?? StatusCodes.Status400BadRequest, creditNoteNumberResult.ErrorMessage ?? "Failed to generate credit note number.");

        var creditNote = new SalesInvoice
        {
            TenantId = tenantId.Value,
            InvoiceNumber = creditNoteNumberResult.Value!,
            CustomerId = original.CustomerId,
            CurrencyCode = original.CurrencyCode,
            InvoiceDate = today,
            DueDate = today,
            PaymentTermId = original.PaymentTermId,
            CreditNoteOfInvoiceId = original.Id,
            Status = InvoiceStatus.Issued,
            Notes = NormalizeOptional(request.Notes) ?? $"Credit note for {original.InvoiceNumber}",
            // Totals are the negation of the original invoice
            Subtotal = -original.Subtotal,
            TaxTotal = -original.TaxTotal,
            GrandTotal = -original.GrandTotal,
            PaidTotal = 0m,
        };

        // Copy lines as reference records (positive values show what was credited)
        creditNote.Lines = original.Lines
            .Where(x => x.IsActive)
            .Select(line => new SalesInvoiceLine
            {
                TenantId = tenantId.Value,
                SalesInvoiceId = creditNote.Id,
                ProductId = line.ProductId,
                TaxCodeId = line.TaxCodeId,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                DiscountAmount = line.DiscountAmount,
                TaxAmount = line.TaxAmount,
            })
            .ToList();

        dbContext.SalesInvoices.Add(creditNote);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(creditNote.Adapt<SalesInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> ApplyPaymentAsync(Guid salesInvoiceId, decimal amount, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        if (amount <= 0m)
        {
            return ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                ["Amount"] = ["Payment amount must be greater than zero."]
            });
        }

        var invoice = await dbContext.SalesInvoices.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status == InvoiceStatus.Draft || invoice.Status == InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = invoice.PaidTotal + amount;
        if (nextPaidTotal + invoice.AppliedCreditTotal > invoice.GrandTotal)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        invoice.PaidTotal = nextPaidTotal;
        invoice.Status = nextPaidTotal == invoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    protected override IEntityResponse<SalesInvoice> BuildEntityResponse(SalesInvoice entity)
    {
        return entity.Adapt<SalesInvoiceDetailsResponse>();
    }

    protected override Task<SalesInvoice> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<SalesInvoice> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<SalesInvoice>(null!);
    }

    protected override Task<SalesInvoice> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<SalesInvoice>(null!);
    }

    internal static void RecalcTotals(SalesInvoice invoice)
    {
        invoice.Subtotal = invoice.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
        invoice.TaxTotal = invoice.Lines.Where(x => x.IsActive).Sum(x => x.TaxAmount);
        invoice.GrandTotal = invoice.Subtotal + invoice.TaxTotal;
    }

    private async Task<ServiceResult<string>> ResolveInvoiceNumberAsync(string invoiceNumber, DateOnly invoiceDate, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(invoiceNumber) && !string.Equals(invoiceNumber.Trim(), "AUTO", StringComparison.OrdinalIgnoreCase))
            return ServiceResult<string>.Success(invoiceNumber.Trim().ToUpperInvariant());

        var nextNumber = await _numberingService.GenerateNextAsync("SALES_INVOICE", invoiceDate, cancellationToken);
        if (!nextNumber.Succeeded)
            return ServiceResult<string>.Failure(nextNumber.StatusCode ?? StatusCodes.Status400BadRequest, nextNumber.ErrorMessage ?? "Failed to generate invoice number.");

        return ServiceResult<string>.Success(nextNumber.Value!);
    }

    private static Dictionary<string, string[]> Validate(string invoiceNumber, Guid customerId, string currencyCode, bool requireInvoiceNumber)
    {
        var errors = new Dictionary<string, string[]>();
        if (requireInvoiceNumber && string.IsNullOrWhiteSpace(invoiceNumber)) errors[nameof(CreateSalesInvoiceRequest.InvoiceNumber)] = ["Invoice number is required."];
        if (customerId == Guid.Empty) errors[nameof(CreateSalesInvoiceRequest.CustomerId)] = ["Customer is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreateSalesInvoiceRequest.CurrencyCode)] = ["Currency code is required."];
        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ServiceResult<SalesInvoiceDetailsResponse> MapResult(ServiceResult<IEntityResponse<SalesInvoice>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesInvoiceDetailsResponse>();
            return ServiceResult<SalesInvoiceDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesInvoiceDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
