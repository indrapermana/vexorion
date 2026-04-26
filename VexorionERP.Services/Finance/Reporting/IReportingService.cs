using VexorionERP.Contracts.Finance.Reporting;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IReportingService
{
    Task<ServiceResult<ArAgingReportResponse>> GetArAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<ApAgingReportResponse>> GetApAgingAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<TrialBalanceReportResponse>> GetTrialBalanceAsync(DateOnly asOfDate, CancellationToken cancellationToken = default);
    Task<ServiceResult<FinanceDashboardSnapshotResponse>> GetFinanceDashboardSnapshotAsync(DateOnly asOfDate, int periodDays, CancellationToken cancellationToken = default);
}
