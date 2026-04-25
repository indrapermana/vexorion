using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Receipts;
using VexorionERP.Database;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseReceiptQueryService(AppDbContext dbContext) : IPurchaseReceiptQueryService
{
    public async Task<ServiceResult<List<PurchaseReceiptListItemResponse>>> GetAllForOrderAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        var receipts = await dbContext.PurchaseReceipts
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

        return ServiceResult<List<PurchaseReceiptListItemResponse>>.Success(receipts);
    }

    public async Task<ServiceResult<PurchaseReceiptDetailsResponse>> GetByIdAsync(Guid receiptId, CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.PurchaseReceipts
            .Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.PurchaseOrder)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase receipt not found.");
        }

        return ServiceResult<PurchaseReceiptDetailsResponse>.Success(new PurchaseReceiptDetailsResponse
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
        });
    }
}
