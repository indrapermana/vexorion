using VexorionERP.Contracts.Purchasing.Payments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IVendorPaymentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<VendorPaymentDetailsResponse>> GetByIdAsync(Guid vendorPaymentId, CancellationToken cancellationToken = default);
}