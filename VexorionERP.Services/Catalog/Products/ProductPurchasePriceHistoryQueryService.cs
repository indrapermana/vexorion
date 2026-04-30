using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductPurchasePriceHistoryQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IProductPurchasePriceHistoryQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>> GetLatestBySupplierAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var productExists = await dbContext.Products
            .GetByTenant(TenantId)
            .AsNoTracking()
            .AnyAsync(x => x.Id == productId, cancellationToken);

        if (!productExists)
        {
            return ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>.Failure(
                StatusCodes.Status404NotFound,
                "Product not found.");
        }

        var candidates = await (
            from line in dbContext.PurchaseInvoiceLines.GetByTenant(TenantId).AsNoTracking()
            join invoice in dbContext.PurchaseInvoices.GetByTenant(TenantId).AsNoTracking()
                on line.PurchaseInvoiceId equals invoice.Id
            join supplier in dbContext.Suppliers.GetByTenant(TenantId).AsNoTracking()
                on invoice.SupplierId equals supplier.Id
            where line.ProductId == productId
                && line.IsActive
                && invoice.IsActive
                && supplier.IsActive
                && invoice.Status != InvoiceStatus.Draft
                && invoice.Status != InvoiceStatus.Cancelled
            orderby invoice.InvoiceDate descending, invoice.Id descending
            select new CandidatePurchasePrice
            {
                SupplierId = supplier.Id,
                SupplierNumber = supplier.SupplierNumber,
                SupplierName = supplier.Name,
                UnitCost = line.UnitCost,
                InvoiceDate = invoice.InvoiceDate,
                InvoiceNumber = invoice.InvoiceNumber,
                CurrencyCode = invoice.CurrencyCode,
            })
            .ToListAsync(cancellationToken);

        var latestBySupplier = candidates
            .GroupBy(x => x.SupplierId)
            .Select(g => g.First())
            .OrderBy(x => x.SupplierName)
            .Select(x => new ProductSupplierLatestPurchasePriceResponse
            {
                SupplierId = x.SupplierId,
                SupplierNumber = x.SupplierNumber,
                SupplierName = x.SupplierName,
                LatestUnitCost = x.UnitCost,
                InvoiceDate = x.InvoiceDate,
                InvoiceNumber = x.InvoiceNumber,
                CurrencyCode = x.CurrencyCode,
            })
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>.Success(latestBySupplier);
    }

    public async Task<ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>> GetHistoryAsync(
        Guid productId,
        Guid? supplierId = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken cancellationToken = default)
    {
        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        if (fromDate.HasValue && toDate.HasValue && fromDate > toDate)
        {
            return ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "fromDate cannot be greater than toDate.");
        }

        var productExists = await dbContext.Products
            .GetByTenant(TenantId)
            .AsNoTracking()
            .AnyAsync(x => x.Id == productId, cancellationToken);

        if (!productExists)
        {
            return ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>.Failure(
                StatusCodes.Status404NotFound,
                "Product not found.");
        }

        var query =
            from line in dbContext.PurchaseInvoiceLines.GetByTenant(TenantId).AsNoTracking()
            join invoice in dbContext.PurchaseInvoices.GetByTenant(TenantId).AsNoTracking()
                on line.PurchaseInvoiceId equals invoice.Id
            join supplier in dbContext.Suppliers.GetByTenant(TenantId).AsNoTracking()
                on invoice.SupplierId equals supplier.Id
            where line.ProductId == productId
                && line.IsActive
                && invoice.IsActive
                && supplier.IsActive
                && invoice.Status != InvoiceStatus.Draft
                && invoice.Status != InvoiceStatus.Cancelled
            select new ProductPurchasePriceHistoryEntryResponse
            {
                PurchaseInvoiceLineId = line.Id,
                PurchaseInvoiceId = invoice.Id,
                SupplierId = supplier.Id,
                SupplierNumber = supplier.SupplierNumber,
                SupplierName = supplier.Name,
                UnitCost = line.UnitCost,
                Quantity = line.Quantity,
                InvoiceDate = invoice.InvoiceDate,
                InvoiceNumber = invoice.InvoiceNumber,
                CurrencyCode = invoice.CurrencyCode,
            };

        if (supplierId.HasValue)
        {
            query = query.Where(x => x.SupplierId == supplierId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.InvoiceDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(x => x.InvoiceDate <= toDate.Value);
        }

        var history = await query
            .OrderByDescending(x => x.InvoiceDate)
            .ThenByDescending(x => x.PurchaseInvoiceId)
            .ThenByDescending(x => x.PurchaseInvoiceLineId)
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>.Success(history);
    }

    public async Task<ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>> GetSupplierSummaryAsync(
        Guid productId,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var historyResult = await GetHistoryAsync(productId, null, fromDate, toDate, cancellationToken);
        if (!historyResult.Succeeded)
        {
            if (historyResult.Validation is not null)
            {
                return ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>.ValidationFailure(
                    historyResult.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            }

            return ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>.Failure(
                historyResult.StatusCode ?? StatusCodes.Status400BadRequest,
                historyResult.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var summary = historyResult.Value!
            .GroupBy(x => new { x.SupplierId, x.SupplierNumber, x.SupplierName })
            .Select(group =>
            {
                var latest = group
                    .OrderByDescending(x => x.InvoiceDate)
                    .ThenByDescending(x => x.PurchaseInvoiceId)
                    .ThenByDescending(x => x.PurchaseInvoiceLineId)
                    .First();

                return new ProductSupplierPurchasePriceSummaryResponse
                {
                    SupplierId = group.Key.SupplierId,
                    SupplierNumber = group.Key.SupplierNumber,
                    SupplierName = group.Key.SupplierName,
                    PurchaseCount = group.Count(),
                    MinUnitCost = group.Min(x => x.UnitCost),
                    MaxUnitCost = group.Max(x => x.UnitCost),
                    AvgUnitCost = Math.Round(group.Average(x => x.UnitCost), 2, MidpointRounding.AwayFromZero),
                    LatestUnitCost = latest.UnitCost,
                    LastPurchaseDate = latest.InvoiceDate,
                    LatestInvoiceNumber = latest.InvoiceNumber,
                    LatestCurrencyCode = latest.CurrencyCode,
                };
            })
            .OrderBy(x => x.SupplierName)
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>.Success(summary);
    }

    private sealed class CandidatePurchasePrice
    {
        public Guid SupplierId { get; set; }
        public string SupplierNumber { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public decimal UnitCost { get; set; }
        public DateOnly InvoiceDate { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = string.Empty;
    }
}
