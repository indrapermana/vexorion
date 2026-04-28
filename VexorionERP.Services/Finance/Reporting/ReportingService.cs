using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class ReportingService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IReportingService
{
    public async Task<ServiceResult<ProfitAndLossReportResponse>> GetProfitAndLossAsync(DateOnly periodStartDate, DateOnly periodEndDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<ProfitAndLossReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        if (periodStartDate > periodEndDate)
            return ServiceResult<ProfitAndLossReportResponse>.Failure(StatusCodes.Status400BadRequest, "Period start date cannot be after period end date.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var rows = await QueryAccountActivityRowsAsync(tenantId, periodStartDate, periodEndDate, cancellationToken);

        var revenueLines = rows
            .Where(x => x.AccountType == AccountType.Revenue)
            .Select(x => new FinancialStatementLineResponse
            {
                AccountId = x.AccountId,
                AccountCode = x.AccountCode,
                AccountName = x.AccountName,
                Amount = x.CreditAmount - x.DebitAmount,
            })
            .Where(x => x.Amount != 0m)
            .OrderBy(x => x.AccountCode)
            .ToList();

        var expenseLines = rows
            .Where(x => x.AccountType == AccountType.Expense)
            .Select(x => new FinancialStatementLineResponse
            {
                AccountId = x.AccountId,
                AccountCode = x.AccountCode,
                AccountName = x.AccountName,
                Amount = x.DebitAmount - x.CreditAmount,
            })
            .Where(x => x.Amount != 0m)
            .OrderBy(x => x.AccountCode)
            .ToList();

        var totalRevenue = revenueLines.Sum(x => x.Amount);
        var totalExpenses = expenseLines.Sum(x => x.Amount);

        return ServiceResult<ProfitAndLossReportResponse>.Success(new ProfitAndLossReportResponse
        {
            PeriodStartDate = periodStartDate,
            PeriodEndDate = periodEndDate,
            TotalRevenue = totalRevenue,
            TotalExpenses = totalExpenses,
            NetIncome = totalRevenue - totalExpenses,
            RevenueLines = revenueLines,
            ExpenseLines = expenseLines,
        });
    }

    public async Task<ServiceResult<BalanceSheetReportResponse>> GetBalanceSheetAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<BalanceSheetReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var rows = await QueryAccountActivityRowsAsync(tenantId, null, asOfDate, cancellationToken);

        var assetLines = rows
            .Where(x => x.AccountType == AccountType.Asset)
            .Select(x => new FinancialStatementLineResponse
            {
                AccountId = x.AccountId,
                AccountCode = x.AccountCode,
                AccountName = x.AccountName,
                Amount = x.DebitAmount - x.CreditAmount,
            })
            .Where(x => x.Amount != 0m)
            .OrderBy(x => x.AccountCode)
            .ToList();

        var liabilityLines = rows
            .Where(x => x.AccountType == AccountType.Liability)
            .Select(x => new FinancialStatementLineResponse
            {
                AccountId = x.AccountId,
                AccountCode = x.AccountCode,
                AccountName = x.AccountName,
                Amount = x.CreditAmount - x.DebitAmount,
            })
            .Where(x => x.Amount != 0m)
            .OrderBy(x => x.AccountCode)
            .ToList();

        var equityLines = rows
            .Where(x => x.AccountType == AccountType.Equity)
            .Select(x => new FinancialStatementLineResponse
            {
                AccountId = x.AccountId,
                AccountCode = x.AccountCode,
                AccountName = x.AccountName,
                Amount = x.CreditAmount - x.DebitAmount,
            })
            .Where(x => x.Amount != 0m)
            .OrderBy(x => x.AccountCode)
            .ToList();

        var currentRevenue = rows
            .Where(x => x.AccountType == AccountType.Revenue)
            .Sum(x => x.CreditAmount - x.DebitAmount);

        var currentExpenses = rows
            .Where(x => x.AccountType == AccountType.Expense)
            .Sum(x => x.DebitAmount - x.CreditAmount);

        var currentEarnings = currentRevenue - currentExpenses;

        var totalAssets = assetLines.Sum(x => x.Amount);
        var totalLiabilities = liabilityLines.Sum(x => x.Amount);
        var totalEquity = equityLines.Sum(x => x.Amount);

        return ServiceResult<BalanceSheetReportResponse>.Success(new BalanceSheetReportResponse
        {
            AsOfDate = asOfDate,
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            TotalEquity = totalEquity,
            CurrentEarnings = currentEarnings,
            TotalLiabilitiesAndEquity = totalLiabilities + totalEquity + currentEarnings,
            AssetLines = assetLines,
            LiabilityLines = liabilityLines,
            EquityLines = equityLines,
        });
    }

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

    private async Task<List<AccountActivityRow>> QueryAccountActivityRowsAsync(Guid tenantId, DateOnly? startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
    {
        var entries =
            from line in dbContext.JournalEntryLines.AsNoTracking()
            join journal in dbContext.JournalEntries.AsNoTracking() on line.JournalEntryId equals journal.Id
            join account in dbContext.Accounts.AsNoTracking() on line.AccountId equals account.Id
            where line.TenantId == tenantId
                  && journal.TenantId == tenantId
                  && account.TenantId == tenantId
                  && journal.Status == JournalEntryStatus.Posted
                  && journal.PostingDate <= endDateInclusive
                  && (!startDateInclusive.HasValue || journal.PostingDate >= startDateInclusive.Value)
            group new { line, account } by new
            {
                account.Id,
                account.Code,
                account.Name,
                account.AccountType,
            }
            into grouped
            select new AccountActivityRow
            {
                AccountId = grouped.Key.Id,
                AccountCode = grouped.Key.Code,
                AccountName = grouped.Key.Name,
                AccountType = grouped.Key.AccountType,
                DebitAmount = grouped.Sum(x => x.line.DebitAmount),
                CreditAmount = grouped.Sum(x => x.line.CreditAmount),
            };

        return await entries.ToListAsync(cancellationToken);
    }

    private sealed class AccountActivityRow
    {
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public AccountType AccountType { get; set; }
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }
    }

    public async Task<ServiceResult<AccountDrillDownResponse>> GetAccountDrillDownAsync(Guid accountId, DateOnly? periodStartDate, DateOnly periodEndDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<AccountDrillDownResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var account = await dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && a.Id == accountId)
            .Select(a => new { a.Id, a.Code, a.Name })
            .FirstOrDefaultAsync(cancellationToken);

        if (account is null)
            return ServiceResult<AccountDrillDownResponse>.Failure(StatusCodes.Status404NotFound, "Account not found.");

        var lines = await (
            from line in dbContext.JournalEntryLines.AsNoTracking()
            join journal in dbContext.JournalEntries.AsNoTracking() on line.JournalEntryId equals journal.Id
            where line.TenantId == tenantId
                  && journal.TenantId == tenantId
                  && journal.Status == JournalEntryStatus.Posted
                  && line.AccountId == accountId
                  && journal.PostingDate <= periodEndDate
                  && (!periodStartDate.HasValue || journal.PostingDate >= periodStartDate.Value)
            orderby journal.PostingDate, journal.JournalNumber
            select new JournalLineDetailResponse
            {
                JournalEntryId = journal.Id,
                JournalNumber = journal.JournalNumber,
                PostingDate = journal.PostingDate,
                Description = journal.Description ?? journal.SourceDocumentType,
                DebitAmount = line.DebitAmount,
                CreditAmount = line.CreditAmount,
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<AccountDrillDownResponse>.Success(new AccountDrillDownResponse
        {
            AccountId = account.Id,
            AccountCode = account.Code,
            AccountName = account.Name,
            PeriodStartDate = periodStartDate,
            PeriodEndDate = periodEndDate,
            TotalDebit = lines.Sum(x => x.DebitAmount),
            TotalCredit = lines.Sum(x => x.CreditAmount),
            Lines = lines,
        });
    }
}
