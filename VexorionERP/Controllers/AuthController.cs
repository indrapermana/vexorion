using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Auth;
using VexorionERP.Services;
using VexorionERP.Services.Results;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    IAuthApplicationService authApplicationService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await authApplicationService.LoginAsync(request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshTokenRequest request)
    {
        var result = await authApplicationService.RefreshAsync(request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var result = await authApplicationService.GetCurrentUserAsync(User, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [Authorize]
    [HttpGet("permissions")]
    public ActionResult<PermissionListResponse> Permissions()
    {
        return ToActionResult(authApplicationService.GetPermissions(User));
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
        var result = await authApplicationService.LogoutRefreshAsync(User, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [Authorize]
    [HttpPost("revoke-sessions")]
    public async Task<ActionResult> RevokeSessions()
    {
        var result = await authApplicationService.RevokeSessionsAsync(User, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ActionResult ToActionResult(ServiceResult<bool> result)
    {
        if (result.Succeeded)
        {
            return NoContent();
        }

        if (result.Validation is not null)
        {
            return BadRequest(result.Validation);
        }

        return result.StatusCode switch
        {
            401 => Unauthorized(),
            403 => Forbid(),
            404 => NotFound(),
            409 => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }

    private ActionResult<T> ToActionResult<T>(ServiceResult<T> result)
    {
        if (result.Succeeded)
        {
            return Ok(result.Value);
        }

        if (result.Validation is not null)
        {
            return BadRequest(result.Validation);
        }

        return result.StatusCode switch
        {
            401 => Unauthorized(),
            403 => Forbid(),
            404 => NotFound(),
            409 => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }
}