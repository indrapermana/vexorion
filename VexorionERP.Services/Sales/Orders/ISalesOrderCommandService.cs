using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISalesOrderCommandService
{
    Task<ServiceResult<SalesOrderDetailsResponse>> CreateAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesOrderDetailsResponse>> UpdateAsync(Guid salesOrderId, UpdateSalesOrderRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid salesOrderId, CancellationToken cancellationToken = default);
}
