using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseInvoiceLineQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseLineQueryService<PurchaseInvoice, PurchaseInvoiceLine>(currentTenantProvider)
{
    protected override string ParentNotFoundMessage => "Purchase invoice not found.";

    protected override string LineNotFoundMessage => "Purchase invoice line not found.";

    protected override async Task<bool> ParentExistsAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        return await context.GetByTenant<PurchaseInvoice>(TenantId)
            .AnyAsync(x => x.Id == parentId, cancellationToken);
    }

    protected override async Task<IReadOnlyCollection<IEntityListResponse<PurchaseInvoiceLine>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        var lines = await context.GetByTenant<PurchaseInvoiceLine>(TenantId)
            .AsNoTracking()
            .Where(x => x.PurchaseInvoiceId == parentId)
            .ToListAsync(cancellationToken);

        return lines.Adapt<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>()
            .Cast<IEntityListResponse<PurchaseInvoiceLine>>()
            .ToArray();
    }

    protected override async Task<IEntityResponse<PurchaseInvoiceLine>?> GetByIdCoreAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken)
    {
        var line = await context.GetByTenant<PurchaseInvoiceLine>(TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == lineId && x.PurchaseInvoiceId == parentId, cancellationToken);

        return line?.Adapt<PurchaseInvoiceLineDetailsResponse>();
    }
}
