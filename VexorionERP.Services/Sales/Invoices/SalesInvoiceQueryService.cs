using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesInvoiceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseFilteredQueryService<SalesInvoice, bool>(currentTenantProvider)
{
    protected override bool DefaultFilter => false;

    protected override IQueryable<SalesInvoice> ApplyFilter(IQueryable<SalesInvoice> query, bool outstandingOnly)
        => outstandingOnly ? query.Where(x => x.GrandTotal > x.PaidTotal) : query;

    protected override IQueryable<SalesInvoice> ApplyOrdering(IQueryable<SalesInvoice> query)
        => query.OrderByDescending(x => x.InvoiceDate);

    public new async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesInvoice>>>> GetAllAsync(bool outstandingOnly, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesInvoice>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invoices = await ApplyOrdering(ApplyFilter(context.GetByTenant<SalesInvoice>(TenantId).AsNoTracking(), outstandingOnly))
            .ToListAsync(cancellationToken);

        var mapped = invoices.Adapt<IReadOnlyCollection<SalesInvoiceListItemResponse>>()
            .Cast<IEntityListResponse<SalesInvoice>>()
            .ToArray();

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesInvoice>>>.Success(mapped);
    }

    public async Task<ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAllAsync(bool outstandingOnly = false, CancellationToken cancellationToken = default)
    {
        var result = await GetAllAsync(outstandingOnly, dbContext, cancellationToken);
        return result.Succeeded
            ? ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Success(result.Value!.Cast<SalesInvoiceListItemResponse>().ToArray())
            : result.Validation is not null
                ? ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value))
                : ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> GetByIdAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        var result = await GetByIdAsync(salesInvoiceId, dbContext, cancellationToken);
        return result.Succeeded
            ? ServiceResult<SalesInvoiceDetailsResponse>.Success(result.Value!.Adapt<SalesInvoiceDetailsResponse>())
            : result.Validation is not null
                ? ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value))
                : ServiceResult<SalesInvoiceDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
