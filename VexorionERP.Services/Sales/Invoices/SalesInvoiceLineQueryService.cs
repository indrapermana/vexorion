using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesInvoiceLineQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesInvoiceLineQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>> GetAllAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoiceExists = await dbContext.SalesInvoices.AnyAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (!invoiceExists)
            return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        var lines = await dbContext.SalesInvoiceLines.AsNoTracking()
            .Where(x => x.SalesInvoiceId == salesInvoiceId)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>.Success(lines.Adapt<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>());
    }

    public async Task<ServiceResult<SalesInvoiceLineDetailsResponse>> GetByIdAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoiceExists = await dbContext.SalesInvoices.AnyAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (!invoiceExists)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        var line = await dbContext.SalesInvoiceLines.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceLineId && x.SalesInvoiceId == salesInvoiceId, cancellationToken);

        return line is null
            ? ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice line not found.")
            : ServiceResult<SalesInvoiceLineDetailsResponse>.Success(line.Adapt<SalesInvoiceLineDetailsResponse>());
    }
}
