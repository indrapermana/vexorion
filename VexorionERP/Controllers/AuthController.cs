using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;

namespace VexorionERP;

[ApiController]
[Route("api/auth")]
public class AuthController(IMediator mediator) : ServiceResultControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await mediator.Send(new LoginCommand(request));
        return ToActionResult(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshTokenRequest request)
    {
        var result = await mediator.Send(new RefreshTokenCommand(request));
        return ToActionResult(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var result = await mediator.Send(new GetCurrentUserQuery());
        return ToActionResult(result);
    }

    [Authorize]
    [HttpGet("permissions")]
    public async Task<ActionResult<PermissionListResponse>> Permissions()
    {
        var result = await mediator.Send(new GetPermissionsQuery());
        return ToActionResult(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public ActionResult Logout()
    {
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout-refresh")]
    public async Task<ActionResult> LogoutRefresh([FromBody] RefreshTokenRequest request)
    {
        var result = await mediator.Send(new LogoutRefreshCommand(request));
        return ToActionResult(result);
    }

    [Authorize]
    [HttpPost("revoke-sessions")]
    public async Task<ActionResult> RevokeSessions()
    {
        var result = await mediator.Send(new RevokeSessionsCommand());
        return ToActionResult(result);
    }
}
