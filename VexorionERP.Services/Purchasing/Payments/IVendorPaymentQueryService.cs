using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IVendorPaymentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<VendorPaymentDetailsResponse>> GetByIdAsync(Guid vendorPaymentId, CancellationToken cancellationToken = default);
}
