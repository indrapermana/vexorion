using VexorionERP.Contracts.Sales.Lines;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesOrderLineCommandService
{
    Task<ServiceResult<SalesOrderLineDetailsResponse>> CreateAsync(Guid salesOrderId, CreateSalesOrderLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesOrderLineDetailsResponse>> UpdateAsync(Guid salesOrderId, Guid salesOrderLineId, UpdateSalesOrderLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid salesOrderId, Guid salesOrderLineId, CancellationToken cancellationToken = default);
}