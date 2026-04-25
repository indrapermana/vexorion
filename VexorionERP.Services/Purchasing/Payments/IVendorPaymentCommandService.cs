using VexorionERP.Contracts.Purchasing.Payments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IVendorPaymentCommandService
{
    Task<ServiceResult<VendorPaymentDetailsResponse>> CreateAsync(CreateVendorPaymentRequest request, CancellationToken cancellationToken = default);
}