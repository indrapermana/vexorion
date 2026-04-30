using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class LoginCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<LoginCommand, ServiceResult<LoginResponse>>
{
    public async ValueTask<ServiceResult<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var authApplicationService = serviceProvider.GetRequiredService<IAuthApplicationService>();
        return await authApplicationService.LoginAsync(request.Request, cancellationToken);
    }
}
