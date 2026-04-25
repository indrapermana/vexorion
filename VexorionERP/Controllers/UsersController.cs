using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Users;
using VexorionERP.Models.Identity;
using VexorionERP.Services;
using VexorionERP.Services.Results;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(
    IUserManagementService userManagementService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Users.View)]
    public async Task<ActionResult<IReadOnlyCollection<UserListItemResponse>>> GetAll()
    {
        var result = await userManagementService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult<UserListItemResponse>> Create([FromBody] CreateUserRequest request)
    {
        var result = await userManagementService.CreateAsync(request, User, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPatch("{userId:guid}/status")]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult> SetStatus(Guid userId, [FromBody] DisableUserRequest request)
    {
        var result = await userManagementService.SetStatusAsync(userId, request, User, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{userId:guid}/reset-password")]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult> ResetPassword(Guid userId, [FromBody] ResetPasswordRequest request)
    {
        var result = await userManagementService.ResetPasswordAsync(userId, request, User, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{userId:guid}/unlock")]
    [Authorize(Policy = AppPermissions.Users.Manage)]
    public async Task<ActionResult> Unlock(Guid userId)
    {
        var result = await userManagementService.UnlockAsync(userId, User, HttpContext.RequestAborted);
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
            400 => BadRequest(new { message = result.ErrorMessage }),
            404 => NotFound(),
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
            400 => BadRequest(new { message = result.ErrorMessage }),
            404 => NotFound(),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }
}