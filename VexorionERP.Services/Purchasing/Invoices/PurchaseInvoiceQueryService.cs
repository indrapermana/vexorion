using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseInvoiceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseFilteredQueryService<PurchaseInvoice, bool>(currentTenantProvider)
{
    protected override bool DefaultFilter => false;

    protected override IQueryable<PurchaseInvoice> ApplyFilter(IQueryable<PurchaseInvoice> query, bool outstandingOnly)
        => outstandingOnly ? query.Where(x => x.GrandTotal > x.PaidTotal) : query;

    protected override IQueryable<PurchaseInvoice> ApplyOrdering(IQueryable<PurchaseInvoice> query)
        => query.OrderByDescending(x => x.InvoiceDate);

    public new async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseInvoice>>>> GetAllAsync(bool outstandingOnly, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseInvoice>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invoices = await ApplyOrdering(ApplyFilter(context.GetByTenant<PurchaseInvoice>(TenantId).AsNoTracking(), outstandingOnly))
            .ToListAsync(cancellationToken);

        var mapped = invoices.Adapt<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>()
            .Cast<IEntityListResponse<PurchaseInvoice>>()
            .ToArray();

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseInvoice>>>.Success(mapped);
    }

    public async Task<ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAllAsync(bool outstandingOnly = false, CancellationToken cancellationToken = default)
    {
        var result = await GetAllAsync(outstandingOnly, dbContext, cancellationToken);
        return result.Succeeded
            ? ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.Success(result.Value!.Cast<PurchaseInvoiceListItemResponse>().ToArray())
            : result.Validation is not null
                ? ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value))
                : ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> GetByIdAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default)
    {
        var result = await GetByIdAsync(purchaseInvoiceId, dbContext, cancellationToken);
        return result.Succeeded
            ? ServiceResult<PurchaseInvoiceDetailsResponse>.Success(result.Value!.Adapt<PurchaseInvoiceDetailsResponse>())
            : result.Validation is not null
                ? ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value))
                : ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
