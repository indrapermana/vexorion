using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InvoiceLineQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseLineQueryService<Invoice, InvoiceLine>(currentTenantProvider)
{
    protected override string LineNotFoundMessage => "Invoice line not found.";

    protected override async Task<IReadOnlyCollection<IEntityListResponse<InvoiceLine>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        var lines = await context.GetByTenant<InvoiceLine>(TenantId)
            .AsNoTracking()
            .Where(x => x.InvoiceId == parentId)
            .ToListAsync(cancellationToken);

        return lines.Adapt<IReadOnlyCollection<InvoiceLineListItemResponse>>()
            .Cast<IEntityListResponse<InvoiceLine>>()
            .ToArray();
    }

    protected override async Task<IEntityResponse<InvoiceLine>?> GetByIdCoreAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken)
    {
        var line = await context.GetByTenant<InvoiceLine>(TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.InvoiceId == parentId && x.Id == lineId, cancellationToken);

        return line?.Adapt<InvoiceLineDetailsResponse>();
    }
}
