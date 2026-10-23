using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface IPasswordResetService
{
    Task<ServiceResult<bool>> RequestResetAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> ValidateTokenAsync(ResetTokenRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> CompleteResetAsync(CompletePasswordResetRequest request, CancellationToken cancellationToken = default);
}
