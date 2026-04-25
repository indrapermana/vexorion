using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Billing.Lines;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class InvoiceLineQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInvoiceLineQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>> GetAllAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var lines = await dbContext.InvoiceLines.AsNoTracking().Where(x => x.InvoiceId == invoiceId).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>.Success(lines.Adapt<IReadOnlyCollection<InvoiceLineListItemResponse>>());
    }

    public async Task<ServiceResult<InvoiceLineDetailsResponse>> GetByIdAsync(Guid invoiceId, Guid invoiceLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var line = await dbContext.InvoiceLines.AsNoTracking().FirstOrDefaultAsync(x => x.InvoiceId == invoiceId && x.Id == invoiceLineId, cancellationToken);
        return line is null
            ? ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Invoice line not found.")
            : ServiceResult<InvoiceLineDetailsResponse>.Success(line.Adapt<InvoiceLineDetailsResponse>());
    }
}