using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class StockCountLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseLineCommandService<StockCount, StockCountLine, CreateStockCountLineRequest, UpdateStockCountLineRequest>
{
    protected override async Task<ServiceResult<ILineResponse<StockCountLine>>> CreateAsync(Guid stockCountId, CreateStockCountLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(stockCountId, request.ProductId, request.SystemQuantity, request.CountedQuantity);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.ValidationFailure(validation);
        }

        var stockCount = await dbContext.StockCounts.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);
        if (stockCount is null)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");
        }

        if (stockCount.Status != DocumentStatus.Draft)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status400BadRequest, "Stock count lines can only be modified while the stock count is in Draft status.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (HasDuplicateProductLine(stockCount, request.ProductId))
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status409Conflict, "An active stock count line already exists for this product.");
        }

        var line = request.Adapt<StockCountLine>();
        line.TenantId = currentTenantProvider.TenantId ?? stockCount.TenantId;
        line.StockCountId = stockCountId;

        dbContext.StockCountLines.Add(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<ILineResponse<StockCountLine>>.Success(line.Adapt<StockCountLineDetailsResponse>());
    }

    protected override async Task<ServiceResult<ILineResponse<StockCountLine>>> UpdateAsync(Guid stockCountId, Guid stockCountLineId, UpdateStockCountLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(stockCountId, request.ProductId, request.SystemQuantity, request.CountedQuantity);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.ValidationFailure(validation);
        }

        var stockCount = await dbContext.StockCounts.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);
        if (stockCount is null)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");
        }

        if (stockCount.Status != DocumentStatus.Draft)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status400BadRequest, "Stock count lines can only be modified while the stock count is in Draft status.");
        }

        var line = stockCount.Lines.FirstOrDefault(x => x.Id == stockCountLineId);
        if (line is null)
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status404NotFound, "Stock count line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (HasDuplicateProductLine(stockCount, request.ProductId, stockCountLineId))
        {
            return ServiceResult<ILineResponse<StockCountLine>>.Failure(StatusCodes.Status409Conflict, "An active stock count line already exists for this product.");
        }

        request.Adapt(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<ILineResponse<StockCountLine>>.Success(line.Adapt<StockCountLineDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid stockCountId, Guid stockCountLineId, CancellationToken cancellationToken = default)
    {
        var stockCount = await dbContext.StockCounts.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);
        if (stockCount is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");
        }

        if (stockCount.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Stock count lines can only be modified while the stock count is in Draft status.");
        }

        var line = stockCount.Lines.FirstOrDefault(x => x.Id == stockCountLineId);
        if (line is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock count line not found.");
        }

        dbContext.StockCountLines.Remove(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid stockCountId, Guid productId, decimal systemQuantity, decimal countedQuantity)
    {
        var errors = new Dictionary<string, string[]>();
        if (stockCountId == Guid.Empty) errors[nameof(CreateStockCountLineRequest)] = ["Stock count is required."];
        if (productId == Guid.Empty) errors[nameof(CreateStockCountLineRequest.ProductId)] = ["Product is required."];
        if (systemQuantity < 0) errors[nameof(CreateStockCountLineRequest.SystemQuantity)] = ["System quantity cannot be negative."];
        if (countedQuantity < 0) errors[nameof(CreateStockCountLineRequest.CountedQuantity)] = ["Counted quantity cannot be negative."];
        return errors;
    }

    private static bool HasDuplicateProductLine(StockCount stockCount, Guid productId, Guid? excludingLineId = null)
        => stockCount.Lines.Any(x => x.IsActive && x.ProductId == productId && x.Id != excludingLineId);
}
