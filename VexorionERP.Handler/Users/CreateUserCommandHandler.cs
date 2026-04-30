using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateUserCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreateUserCommand, ServiceResult<UserListItemResponse>>
{
    public async ValueTask<ServiceResult<UserListItemResponse>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var userManagementService = serviceProvider.GetRequiredService<IUserManagementService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await userManagementService.CreateAsync(request.Request, user, cancellationToken);
    }
}
