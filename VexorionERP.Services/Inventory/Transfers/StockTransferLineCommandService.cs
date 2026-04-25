using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Transfers;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class StockTransferLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IStockTransferLineCommandService
{
    public async Task<ServiceResult<StockTransferLineDetailsResponse>> CreateAsync(Guid stockTransferId, CreateStockTransferLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(stockTransferId, request.ProductId, request.Quantity, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.ValidationFailure(validation);
        }

        var transfer = await dbContext.StockTransfers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);
        if (transfer is null)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.");
        }

        if (transfer.Status != DocumentStatus.Draft)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Stock transfer lines can only be modified while the transfer is in Draft status.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (HasDuplicateProductLine(transfer, request.ProductId))
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An active transfer line already exists for this product.");
        }

        var line = request.Adapt<StockTransferLine>();
        line.TenantId = currentTenantProvider.TenantId ?? transfer.TenantId;
        line.StockTransferId = stockTransferId;

        dbContext.StockTransferLines.Add(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<StockTransferLineDetailsResponse>.Success(line.Adapt<StockTransferLineDetailsResponse>());
    }

    public async Task<ServiceResult<StockTransferLineDetailsResponse>> UpdateAsync(Guid stockTransferId, Guid stockTransferLineId, UpdateStockTransferLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(stockTransferId, request.ProductId, request.Quantity, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.ValidationFailure(validation);
        }

        var transfer = await dbContext.StockTransfers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);
        if (transfer is null)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.");
        }

        if (transfer.Status != DocumentStatus.Draft)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Stock transfer lines can only be modified while the transfer is in Draft status.");
        }

        var line = transfer.Lines.FirstOrDefault(x => x.Id == stockTransferLineId);
        if (line is null)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock transfer line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (HasDuplicateProductLine(transfer, request.ProductId, stockTransferLineId))
        {
            return ServiceResult<StockTransferLineDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An active transfer line already exists for this product.");
        }

        request.Adapt(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<StockTransferLineDetailsResponse>.Success(line.Adapt<StockTransferLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid stockTransferId, Guid stockTransferLineId, CancellationToken cancellationToken = default)
    {
        var transfer = await dbContext.StockTransfers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);
        if (transfer is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.");
        }

        if (transfer.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Stock transfer lines can only be modified while the transfer is in Draft status.");
        }

        var line = transfer.Lines.FirstOrDefault(x => x.Id == stockTransferLineId);
        if (line is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock transfer line not found.");
        }

        dbContext.StockTransferLines.Remove(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid stockTransferId, Guid productId, decimal quantity, decimal unitCost)
    {
        var errors = new Dictionary<string, string[]>();
        if (stockTransferId == Guid.Empty) errors[nameof(CreateStockTransferLineRequest)] = ["Stock transfer is required."];
        if (productId == Guid.Empty) errors[nameof(CreateStockTransferLineRequest.ProductId)] = ["Product is required."];
        if (quantity <= 0) errors[nameof(CreateStockTransferLineRequest.Quantity)] = ["Quantity must be greater than zero."];
        if (unitCost < 0) errors[nameof(CreateStockTransferLineRequest.UnitCost)] = ["Unit cost cannot be negative."];
        return errors;
    }

    private static bool HasDuplicateProductLine(StockTransfer transfer, Guid productId, Guid? excludingLineId = null)
        => transfer.Lines.Any(x => x.IsActive && x.ProductId == productId && x.Id != excludingLineId);
}