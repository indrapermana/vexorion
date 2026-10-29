using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Users.View)]
    public async Task<ActionResult<IReadOnlyCollection<UserListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetUsersQuery());
        return ToActionResult(result);
    }

    [HttpGet("admin")]
    [Authorize(Policy = AppPermissions.Tenants.View, Roles = AppRoles.SystemAdmin)]
    public async Task<ActionResult<IReadOnlyCollection<UserListItemResponse>>> GetAllForAdmin([FromQuery] Guid? tenantId)
    {
        var result = await mediator.Send(new GetUsersForAdminQuery(tenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult<UserListItemResponse>> Create([FromBody] CreateUserRequest request)
    {
        var result = await mediator.Send(new CreateUserCommand(request));
        return ToActionResult(result);
    }

    [HttpPatch("{userId:guid}/status")]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult> SetStatus(Guid userId, [FromBody] DisableUserRequest request)
    {
        var result = await mediator.Send(new SetUserStatusCommand(userId, request));
        return ToActionResult(result);
    }

    [HttpPost("{userId:guid}/reset-password")]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult> ResetPassword(Guid userId, [FromBody] ResetPasswordRequest request)
    {
        var result = await mediator.Send(new ResetUserPasswordCommand(userId, request));
        return ToActionResult(result);
    }

    [HttpPost("{userId:guid}/unlock")]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult> Unlock(Guid userId)
    {
        var result = await mediator.Send(new UnlockUserCommand(userId));
        return ToActionResult(result);
    }
}
