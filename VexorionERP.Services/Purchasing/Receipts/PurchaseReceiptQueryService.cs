using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseReceiptQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseChildQueryService<PurchaseOrder, PurchaseReceipt>(currentTenantProvider)
{
    protected override async Task<IReadOnlyCollection<IEntityListResponse<PurchaseReceipt>>> GetAllForParentCoreAsync(Guid purchaseOrderId, AppDbContext context, CancellationToken cancellationToken)
    {
        var receipts = await context.PurchaseReceipts
            .GetByTenant(TenantId)
            .Include(x => x.Warehouse)
            .Where(x => x.PurchaseOrderId == purchaseOrderId)
            .OrderByDescending(x => x.ReceiptDate)
            .Select(x => new PurchaseReceiptListItemResponse
            {
                Id = x.Id,
                ReceiptNumber = x.ReceiptNumber,
                PurchaseOrderId = x.PurchaseOrderId,
                WarehouseId = x.WarehouseId,
                WarehouseName = x.Warehouse!.Name,
                ReceiptDate = x.ReceiptDate,
                Status = x.Status,
                PostedAtUtc = x.PostedAtUtc,
                LineCount = x.Lines.Count(l => l.IsActive),
            })
            .ToListAsync(cancellationToken);

        return receipts;
    }

    protected override async Task<IEntityResponse<PurchaseReceipt>?> GetByIdCoreAsync(Guid receiptId, AppDbContext context, CancellationToken cancellationToken)
    {
        var receipt = await context.PurchaseReceipts
            .GetByTenant(TenantId)
            .Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.PurchaseOrder)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null)
        {
            return null;
        }

        return new PurchaseReceiptDetailsResponse
        {
            Id = receipt.Id,
            ReceiptNumber = receipt.ReceiptNumber,
            PurchaseOrderId = receipt.PurchaseOrderId,
            PurchaseOrderNumber = receipt.PurchaseOrder?.OrderNumber ?? string.Empty,
            WarehouseId = receipt.WarehouseId,
            WarehouseName = receipt.Warehouse?.Name ?? string.Empty,
            ReceiptDate = receipt.ReceiptDate,
            Status = receipt.Status,
            Notes = receipt.Notes,
            PostedAtUtc = receipt.PostedAtUtc,
            Lines = receipt.Lines.Where(x => x.IsActive).Select(l => new PurchaseReceiptLineResponse
            {
                Id = l.Id,
                PurchaseOrderLineId = l.PurchaseOrderLineId,
                ProductId = l.ProductId,
                ProductName = l.Product?.Name ?? string.Empty,
                ReceivedQuantity = l.ReceivedQuantity,
                UnitCost = l.UnitCost,
                LineTotal = l.ReceivedQuantity * l.UnitCost,
            }).ToList(),
        };
    }
}
