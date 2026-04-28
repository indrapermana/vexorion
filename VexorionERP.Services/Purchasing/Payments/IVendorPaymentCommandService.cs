using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IVendorPaymentCommandService
{
    Task<ServiceResult<VendorPaymentDetailsResponse>> CreateAsync(CreateVendorPaymentRequest request, CancellationToken cancellationToken = default);
}
