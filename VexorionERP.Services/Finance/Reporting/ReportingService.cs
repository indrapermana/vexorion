using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Finance.Reporting;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class ReportingService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IReportingService
{
    public async Task<ServiceResult<FinanceDashboardSnapshotResponse>> GetFinanceDashboardSnapshotAsync(DateOnly asOfDate, int periodDays, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<FinanceDashboardSnapshotResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var normalizedPeriodDays = Math.Clamp(periodDays, 1, 365);
        var periodStartDate = asOfDate.AddDays(1 - normalizedPeriodDays);
        var tenantId = currentTenantProvider.TenantId.Value;

        var openSalesInvoices = await dbContext.SalesInvoices
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && (x.GrandTotal - x.PaidTotal) > 0m
                        && x.Status != InvoiceStatus.Draft
                        && x.Status != InvoiceStatus.Cancelled)
            .Select(x => new { x.DueDate, BalanceDue = x.GrandTotal - x.PaidTotal })
            .ToListAsync(cancellationToken);

        var openPurchaseInvoices = await dbContext.PurchaseInvoices
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && (x.GrandTotal - x.PaidTotal) > 0m
                        && x.Status != InvoiceStatus.Draft
                        && x.Status != InvoiceStatus.Cancelled)
            .Select(x => new { x.DueDate, BalanceDue = x.GrandTotal - x.PaidTotal })
            .ToListAsync(cancellationToken);

        var revenueInPeriod = await dbContext.SalesInvoices
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && x.InvoiceDate >= periodStartDate
                        && x.InvoiceDate <= asOfDate
                        && x.Status != InvoiceStatus.Draft
                        && x.Status != InvoiceStatus.Cancelled)
            .SumAsync(x => (decimal?)x.GrandTotal, cancellationToken) ?? 0m;

        var cashInInPeriod = await dbContext.CustomerPayments
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && x.PaymentDate >= periodStartDate
                        && x.PaymentDate <= asOfDate)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var cashOutInPeriod = await dbContext.VendorPayments
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && x.PaymentDate >= periodStartDate
                        && x.PaymentDate <= asOfDate)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        return ServiceResult<FinanceDashboardSnapshotResponse>.Success(new FinanceDashboardSnapshotResponse
        {
            AsOfDate = asOfDate,
            PeriodStartDate = periodStartDate,
            PeriodDays = normalizedPeriodDays,
            ReceivablesOpen = openSalesInvoices.Sum(x => x.BalanceDue),
            ReceivablesOverdue = openSalesInvoices.Where(x => x.DueDate < asOfDate).Sum(x => x.BalanceDue),
            PayablesOpen = openPurchaseInvoices.Sum(x => x.BalanceDue),
            PayablesOverdue = openPurchaseInvoices.Where(x => x.DueDate < asOfDate).Sum(x => x.BalanceDue),
            RevenueInPeriod = revenueInPeriod,
            CashInInPeriod = cashInInPeriod,
            CashOutInPeriod = cashOutInPeriod,
            NetCashInPeriod = cashInInPeriod - cashOutInPeriod,
        });
    }

    public async Task<ServiceResult<ArAgingReportResponse>> GetArAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<ArAgingReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var rows = await dbContext.SalesInvoices
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && (x.GrandTotal - x.PaidTotal) > 0m
                        && x.Status != InvoiceStatus.Draft
                        && x.Status != InvoiceStatus.Cancelled)
            .Select(x => new
            {
                x.CustomerId,
                CustomerNumber = x.Customer != null ? x.Customer.CustomerNumber : string.Empty,
                CustomerName = x.Customer != null ? x.Customer.Name : string.Empty,
                x.CurrencyCode,
                x.DueDate,
                BalanceDue = x.GrandTotal - x.PaidTotal,
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .GroupBy(x => new { x.CustomerId, x.CustomerNumber, x.CustomerName, x.CurrencyCode })
            .Select(group => new ArAgingItemResponse
            {
                CustomerId = group.Key.CustomerId,
                CustomerNumber = group.Key.CustomerNumber,
                CustomerName = group.Key.CustomerName,
                CurrencyCode = group.Key.CurrencyCode,
                Buckets = BuildAgingBuckets(group.Select(x => (x.DueDate, x.BalanceDue)), asOfDate),
            })
            .OrderBy(x => x.CustomerNumber)
            .ToList();

        return ServiceResult<ArAgingReportResponse>.Success(new ArAgingReportResponse
        {
            AsOfDate = asOfDate,
            Totals = SumBuckets(items.Select(x => x.Buckets)),
            Items = items,
        });
    }

    public async Task<ServiceResult<ApAgingReportResponse>> GetApAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<ApAgingReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var rows = await dbContext.PurchaseInvoices
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId
                        && (x.GrandTotal - x.PaidTotal) > 0m
                        && x.Status != InvoiceStatus.Draft
                        && x.Status != InvoiceStatus.Cancelled)
            .Select(x => new
            {
                x.SupplierId,
                SupplierNumber = x.Supplier != null ? x.Supplier.SupplierNumber : string.Empty,
                SupplierName = x.Supplier != null ? x.Supplier.Name : string.Empty,
                x.CurrencyCode,
                x.DueDate,
                BalanceDue = x.GrandTotal - x.PaidTotal,
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .GroupBy(x => new { x.SupplierId, x.SupplierNumber, x.SupplierName, x.CurrencyCode })
            .Select(group => new ApAgingItemResponse
            {
                SupplierId = group.Key.SupplierId,
                SupplierNumber = group.Key.SupplierNumber,
                SupplierName = group.Key.SupplierName,
                CurrencyCode = group.Key.CurrencyCode,
                Buckets = BuildAgingBuckets(group.Select(x => (x.DueDate, x.BalanceDue)), asOfDate),
            })
            .OrderBy(x => x.SupplierNumber)
            .ToList();

        return ServiceResult<ApAgingReportResponse>.Success(new ApAgingReportResponse
        {
            AsOfDate = asOfDate,
            Totals = SumBuckets(items.Select(x => x.Buckets)),
            Items = items,
        });
    }

    public async Task<ServiceResult<TrialBalanceReportResponse>> GetTrialBalanceAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<TrialBalanceReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var rows = await (
            from line in dbContext.JournalEntryLines.AsNoTracking()
            join journal in dbContext.JournalEntries.AsNoTracking() on line.JournalEntryId equals journal.Id
            join account in dbContext.Accounts.AsNoTracking() on line.AccountId equals account.Id
            where line.TenantId == tenantId
                  && journal.TenantId == tenantId
                  && account.TenantId == tenantId
                  && journal.Status == JournalEntryStatus.Posted
                  && journal.PostingDate <= asOfDate
            select new
            {
                account.Id,
                account.Code,
                account.Name,
                line.DebitAmount,
                line.CreditAmount,
            })
            .ToListAsync(cancellationToken);

        var lines = rows
            .GroupBy(x => new { x.Id, x.Code, x.Name })
            .Select(group =>
            {
                var totalDebit = group.Sum(x => x.DebitAmount);
                var totalCredit = group.Sum(x => x.CreditAmount);
                var net = totalDebit - totalCredit;

                return new TrialBalanceLineResponse
                {
                    AccountId = group.Key.Id,
                    AccountCode = group.Key.Code,
                    AccountName = group.Key.Name,
                    TotalDebit = totalDebit,
                    TotalCredit = totalCredit,
                    EndingDebit = net > 0 ? net : 0m,
                    EndingCredit = net < 0 ? -net : 0m,
                };
            })
            .OrderBy(x => x.AccountCode)
            .ToList();

        return ServiceResult<TrialBalanceReportResponse>.Success(new TrialBalanceReportResponse
        {
            AsOfDate = asOfDate,
            TotalDebit = lines.Sum(x => x.TotalDebit),
            TotalCredit = lines.Sum(x => x.TotalCredit),
            EndingDebitTotal = lines.Sum(x => x.EndingDebit),
            EndingCreditTotal = lines.Sum(x => x.EndingCredit),
            Lines = lines,
        });
    }

    private static AgingBucketTotalsResponse BuildAgingBuckets(IEnumerable<(DateOnly DueDate, decimal Amount)> rows, DateOnly asOfDate)
    {
        var result = new AgingBucketTotalsResponse();

        foreach (var (dueDate, amount) in rows)
        {
            var ageDays = asOfDate.DayNumber - dueDate.DayNumber;

            if (ageDays <= 0)
                result.Current += amount;
            else if (ageDays <= 30)
                result.Due1To30 += amount;
            else if (ageDays <= 60)
                result.Due31To60 += amount;
            else if (ageDays <= 90)
                result.Due61To90 += amount;
            else
                result.DueOver90 += amount;
        }

        result.Total = result.Current + result.Due1To30 + result.Due31To60 + result.Due61To90 + result.DueOver90;
        return result;
    }

    private static AgingBucketTotalsResponse SumBuckets(IEnumerable<AgingBucketTotalsResponse> buckets)
    {
        return new AgingBucketTotalsResponse
        {
            Current = buckets.Sum(x => x.Current),
            Due1To30 = buckets.Sum(x => x.Due1To30),
            Due31To60 = buckets.Sum(x => x.Due31To60),
            Due61To90 = buckets.Sum(x => x.Due61To90),
            DueOver90 = buckets.Sum(x => x.DueOver90),
            Total = buckets.Sum(x => x.Total),
        };
    }
}
