using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IReportingService
{
    Task<ServiceResult<ArAgingReportResponse>> GetArAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<ApAgingReportResponse>> GetApAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<TrialBalanceReportResponse>> GetTrialBalanceAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<FinanceDashboardSnapshotResponse>> GetFinanceDashboardSnapshotAsync(DateOnly asOfDate, int periodDays, CancellationToken cancellationToken = default);
    Task<ServiceResult<ProfitAndLossReportResponse>> GetProfitAndLossAsync(DateOnly periodStartDate, DateOnly periodEndDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<BalanceSheetReportResponse>> GetBalanceSheetAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<AccountDrillDownResponse>> GetAccountDrillDownAsync(Guid accountId, DateOnly? periodStartDate, DateOnly periodEndDate, CancellationToken cancellationToken = default);
}
