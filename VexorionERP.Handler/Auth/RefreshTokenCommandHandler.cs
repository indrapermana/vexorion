using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class RefreshTokenCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<RefreshTokenCommand, ServiceResult<LoginResponse>>
{
    public async ValueTask<ServiceResult<LoginResponse>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var authApplicationService = serviceProvider.GetRequiredService<IAuthApplicationService>();
        return await authApplicationService.RefreshAsync(request.Request, cancellationToken);
    }
}
