using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesInvoiceLineQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseLineQueryService<SalesInvoice, SalesInvoiceLine>(currentTenantProvider)
{
    protected override string ParentNotFoundMessage => "Sales invoice not found.";

    protected override string LineNotFoundMessage => "Sales invoice line not found.";

    protected override async Task<bool> ParentExistsAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        return await context.GetByTenant<SalesInvoice>(TenantId)
            .AnyAsync(x => x.Id == parentId, cancellationToken);
    }

    protected override async Task<IReadOnlyCollection<IEntityListResponse<SalesInvoiceLine>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        var lines = await context.GetByTenant<SalesInvoiceLine>(TenantId)
            .AsNoTracking()
            .Where(x => x.SalesInvoiceId == parentId)
            .ToListAsync(cancellationToken);

        return lines.Adapt<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>()
            .Cast<IEntityListResponse<SalesInvoiceLine>>()
            .ToArray();
    }

    protected override async Task<IEntityResponse<SalesInvoiceLine>?> GetByIdCoreAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken)
    {
        var line = await context.GetByTenant<SalesInvoiceLine>(TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == lineId && x.SalesInvoiceId == parentId, cancellationToken);

        return line?.Adapt<SalesInvoiceLineDetailsResponse>();
    }
}
