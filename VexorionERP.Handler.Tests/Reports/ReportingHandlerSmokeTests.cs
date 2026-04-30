using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Reports;

public class ReportingHandlerSmokeTests
{
    [Fact]
    public async Task GetArAgingQueryHandler_ForwardsRequest()
    {
        var asOfDate = new DateOnly(2026, 4, 30);
        var reportingService = new FakeReportingService
        {
            ArAgingResult = ServiceResult<ArAgingReportResponse>.Success(new ArAgingReportResponse { AsOfDate = asOfDate }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetArAgingQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetArAgingQuery(asOfDate), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(asOfDate, result.Value!.AsOfDate);
        Assert.Equal(asOfDate, reportingService.LastArAgingAsOfDate);
    }

    [Fact]
    public async Task GetApAgingQueryHandler_ForwardsRequest()
    {
        var asOfDate = new DateOnly(2026, 4, 30);
        var reportingService = new FakeReportingService
        {
            ApAgingResult = ServiceResult<ApAgingReportResponse>.Success(new ApAgingReportResponse { AsOfDate = asOfDate }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetApAgingQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetApAgingQuery(asOfDate), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(asOfDate, result.Value!.AsOfDate);
        Assert.Equal(asOfDate, reportingService.LastApAgingAsOfDate);
    }

    [Fact]
    public async Task GetTrialBalanceQueryHandler_ForwardsRequest()
    {
        var asOfDate = new DateOnly(2026, 4, 30);
        var reportingService = new FakeReportingService
        {
            TrialBalanceResult = ServiceResult<TrialBalanceReportResponse>.Success(new TrialBalanceReportResponse { AsOfDate = asOfDate }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetTrialBalanceQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetTrialBalanceQuery(asOfDate), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(asOfDate, result.Value!.AsOfDate);
        Assert.Equal(asOfDate, reportingService.LastTrialBalanceAsOfDate);
    }

    [Fact]
    public async Task GetDashboardSnapshotQueryHandler_ForwardsRequest()
    {
        var asOfDate = new DateOnly(2026, 4, 30);
        var reportingService = new FakeReportingService
        {
            DashboardResult = ServiceResult<FinanceDashboardSnapshotResponse>.Success(new FinanceDashboardSnapshotResponse
            {
                AsOfDate = asOfDate,
                PeriodStartDate = asOfDate.AddDays(-30),
                PeriodDays = 30,
            }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetDashboardSnapshotQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetDashboardSnapshotQuery(asOfDate, 30), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(asOfDate, result.Value!.AsOfDate);
        Assert.Equal(asOfDate, reportingService.LastDashboardAsOfDate);
        Assert.Equal(30, reportingService.LastDashboardPeriodDays);
    }

    [Fact]
    public async Task GetAccountDrillDownQueryHandler_ForwardsRequest()
    {
        var accountId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 4, 1);
        var endDate = new DateOnly(2026, 4, 30);
        var reportingService = new FakeReportingService
        {
            AccountDrillDownResult = ServiceResult<AccountDrillDownResponse>.Success(new AccountDrillDownResponse
            {
                AccountId = accountId,
                PeriodStartDate = startDate,
                PeriodEndDate = endDate,
            }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetAccountDrillDownQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetAccountDrillDownQuery(accountId, startDate, endDate), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(accountId, result.Value!.AccountId);
        Assert.Equal(accountId, reportingService.LastAccountId);
        Assert.Equal(startDate, reportingService.LastAccountStartDate);
        Assert.Equal(endDate, reportingService.LastAccountEndDate);
    }

    [Fact]
    public async Task GetProfitAndLossQueryHandler_WithPriorPeriod_PopulatesPriorPeriod()
    {
        var currentStart = new DateOnly(2026, 4, 1);
        var currentEnd = new DateOnly(2026, 4, 30);
        var priorStart = new DateOnly(2026, 3, 1);
        var priorEnd = new DateOnly(2026, 3, 31);

        var reportingService = new FakeReportingService
        {
            ProfitAndLossResult = ServiceResult<ProfitAndLossReportResponse>.Success(new ProfitAndLossReportResponse
            {
                PeriodStartDate = currentStart,
                PeriodEndDate = currentEnd,
                TotalRevenue = 1000m,
                TotalExpenses = 700m,
                NetIncome = 300m,
            }),
            PriorProfitAndLossResult = ServiceResult<ProfitAndLossReportResponse>.Success(new ProfitAndLossReportResponse
            {
                PeriodStartDate = priorStart,
                PeriodEndDate = priorEnd,
                TotalRevenue = 900m,
                TotalExpenses = 650m,
                NetIncome = 250m,
            }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetProfitAndLossQueryHandler(serviceProvider);

        var result = await handler.Handle(
            new GetProfitAndLossQuery(currentStart, currentEnd, priorStart, priorEnd),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value!.PriorPeriod);
        Assert.Equal(priorStart, result.Value.PriorPeriod!.PeriodStartDate);
        Assert.Equal(priorEnd, result.Value.PriorPeriod.PeriodEndDate);
        Assert.Equal(2, reportingService.ProfitAndLossCallCount);
    }

    [Fact]
    public async Task GetProfitAndLossQueryHandler_WhenCurrentPeriodFails_ReturnsFailure()
    {
        var reportingService = new FakeReportingService
        {
            ProfitAndLossResult = ServiceResult<ProfitAndLossReportResponse>.Failure(500, "Current period failed"),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetProfitAndLossQueryHandler(serviceProvider);

        var result = await handler.Handle(
            new GetProfitAndLossQuery(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30)),
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(500, result.StatusCode);
        Assert.Equal("Current period failed", result.ErrorMessage);
        Assert.Equal(1, reportingService.ProfitAndLossCallCount);
    }

    [Fact]
    public async Task GetBalanceSheetQueryHandler_WithPriorDate_PopulatesPriorPeriod()
    {
        var currentAsOf = new DateOnly(2026, 4, 30);
        var priorAsOf = new DateOnly(2026, 3, 31);

        var reportingService = new FakeReportingService
        {
            BalanceSheetResult = ServiceResult<BalanceSheetReportResponse>.Success(new BalanceSheetReportResponse
            {
                AsOfDate = currentAsOf,
                TotalAssets = 1000m,
                TotalLiabilities = 400m,
                TotalEquity = 600m,
                CurrentEarnings = 100m,
                TotalLiabilitiesAndEquity = 1000m,
            }),
            PriorBalanceSheetResult = ServiceResult<BalanceSheetReportResponse>.Success(new BalanceSheetReportResponse
            {
                AsOfDate = priorAsOf,
                TotalAssets = 800m,
                TotalLiabilities = 350m,
                TotalEquity = 450m,
                CurrentEarnings = 80m,
                TotalLiabilitiesAndEquity = 800m,
            }),
        };

        using var serviceProvider = BuildServiceProvider(reportingService);
        var handler = new GetBalanceSheetQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetBalanceSheetQuery(currentAsOf, priorAsOf), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value!.PriorPeriod);
        Assert.Equal(priorAsOf, result.Value.PriorPeriod!.AsOfDate);
        Assert.Equal(2, reportingService.BalanceSheetCallCount);
    }

    private static ServiceProvider BuildServiceProvider(FakeReportingService reportingService)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IReportingService>(reportingService);
        return services.BuildServiceProvider();
    }

    private sealed class FakeReportingService : IReportingService
    {
        public ServiceResult<ArAgingReportResponse> ArAgingResult { get; set; } = ServiceResult<ArAgingReportResponse>.Success(new ArAgingReportResponse());
        public ServiceResult<ApAgingReportResponse> ApAgingResult { get; set; } = ServiceResult<ApAgingReportResponse>.Success(new ApAgingReportResponse());
        public ServiceResult<TrialBalanceReportResponse> TrialBalanceResult { get; set; } = ServiceResult<TrialBalanceReportResponse>.Success(new TrialBalanceReportResponse());
        public ServiceResult<FinanceDashboardSnapshotResponse> DashboardResult { get; set; } = ServiceResult<FinanceDashboardSnapshotResponse>.Success(new FinanceDashboardSnapshotResponse());
        public ServiceResult<ProfitAndLossReportResponse> ProfitAndLossResult { get; set; } = ServiceResult<ProfitAndLossReportResponse>.Success(new ProfitAndLossReportResponse());
        public ServiceResult<ProfitAndLossReportResponse> PriorProfitAndLossResult { get; set; } = ServiceResult<ProfitAndLossReportResponse>.Success(new ProfitAndLossReportResponse());
        public ServiceResult<BalanceSheetReportResponse> BalanceSheetResult { get; set; } = ServiceResult<BalanceSheetReportResponse>.Success(new BalanceSheetReportResponse());
        public ServiceResult<BalanceSheetReportResponse> PriorBalanceSheetResult { get; set; } = ServiceResult<BalanceSheetReportResponse>.Success(new BalanceSheetReportResponse());
        public ServiceResult<AccountDrillDownResponse> AccountDrillDownResult { get; set; } = ServiceResult<AccountDrillDownResponse>.Success(new AccountDrillDownResponse());

        public DateOnly LastArAgingAsOfDate { get; private set; }
        public DateOnly LastApAgingAsOfDate { get; private set; }
        public DateOnly LastTrialBalanceAsOfDate { get; private set; }
        public DateOnly LastDashboardAsOfDate { get; private set; }
        public int LastDashboardPeriodDays { get; private set; }
        public Guid LastAccountId { get; private set; }
        public DateOnly? LastAccountStartDate { get; private set; }
        public DateOnly LastAccountEndDate { get; private set; }
        public int ProfitAndLossCallCount { get; private set; }
        public int BalanceSheetCallCount { get; private set; }

        public Task<ServiceResult<ArAgingReportResponse>> GetArAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
        {
            LastArAgingAsOfDate = asOfDate;
            return Task.FromResult(ArAgingResult);
        }

        public Task<ServiceResult<ApAgingReportResponse>> GetApAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
        {
            LastApAgingAsOfDate = asOfDate;
            return Task.FromResult(ApAgingResult);
        }

        public Task<ServiceResult<TrialBalanceReportResponse>> GetTrialBalanceAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
        {
            LastTrialBalanceAsOfDate = asOfDate;
            return Task.FromResult(TrialBalanceResult);
        }

        public Task<ServiceResult<FinanceDashboardSnapshotResponse>> GetFinanceDashboardSnapshotAsync(DateOnly asOfDate, int periodDays, CancellationToken cancellationToken = default)
        {
            LastDashboardAsOfDate = asOfDate;
            LastDashboardPeriodDays = periodDays;
            return Task.FromResult(DashboardResult);
        }

        public Task<ServiceResult<ProfitAndLossReportResponse>> GetProfitAndLossAsync(DateOnly periodStartDate, DateOnly periodEndDate, CancellationToken cancellationToken = default)
        {
            ProfitAndLossCallCount++;
            return Task.FromResult(ProfitAndLossCallCount == 1 ? ProfitAndLossResult : PriorProfitAndLossResult);
        }

        public Task<ServiceResult<BalanceSheetReportResponse>> GetBalanceSheetAsync(DateOnly asOfDate, CancellationToken cancellationToken = default)
        {
            BalanceSheetCallCount++;
            return Task.FromResult(BalanceSheetCallCount == 1 ? BalanceSheetResult : PriorBalanceSheetResult);
        }

        public Task<ServiceResult<AccountDrillDownResponse>> GetAccountDrillDownAsync(Guid accountId, DateOnly? periodStartDate, DateOnly periodEndDate, CancellationToken cancellationToken = default)
        {
            LastAccountId = accountId;
            LastAccountStartDate = periodStartDate;
            LastAccountEndDate = periodEndDate;
            return Task.FromResult(AccountDrillDownResult);
        }
    }
}
