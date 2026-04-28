using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InvoiceQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<Invoice>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Invoice>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<Invoice>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invoices = await context.Invoices.GetByTenant(tenantId.Value).AsNoTracking().OrderByDescending(x => x.InvoiceDate).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<Invoice>>>.Success(invoices.Adapt<IReadOnlyCollection<IEntityListResponse<Invoice>>>());
    }

    public async Task<ServiceResult<IEntityResponse<Invoice>>> GetByIdAsync(Guid invoiceId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<Invoice>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invoice = await context.Invoices.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        return invoice is null
            ? ServiceResult<IEntityResponse<Invoice>>.Failure(StatusCodes.Status404NotFound, "Invoice not found.")
            : ServiceResult<IEntityResponse<Invoice>>.Success(invoice.Adapt<InvoiceDetailsResponse>());
    }
}
