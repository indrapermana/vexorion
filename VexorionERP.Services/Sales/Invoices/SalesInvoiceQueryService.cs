using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesInvoiceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesInvoiceQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoices = await dbContext.SalesInvoices.AsNoTracking()
            .Where(x => x.TenantId == currentTenantProvider.TenantId.Value)
            .OrderByDescending(x => x.InvoiceDate)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Success(invoices.Adapt<IReadOnlyCollection<SalesInvoiceListItemResponse>>());
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> GetByIdAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);

        return invoice is null
            ? ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.")
            : ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }
}
