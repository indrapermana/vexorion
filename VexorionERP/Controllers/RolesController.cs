using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Roles;
using VexorionERP.Models.Identity;
using VexorionERP.Services;
using VexorionERP.Services.Results;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController(
    IRoleManagementService roleManagementService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Roles.View)]
    public ActionResult<IReadOnlyCollection<RolePermissionsResponse>> GetRolePermissions()
    {
        return ToActionResult(roleManagementService.GetRolePermissions());
    }

    [HttpPut("users/{userId:guid}")]
    [Authorize(Policy = AppPermissions.Roles.Manage)]
    public async Task<ActionResult> AssignUserRoles(Guid userId, [FromBody] AssignUserRolesRequest request)
    {
        var result = await roleManagementService.AssignUserRolesAsync(userId, request, User, HttpContext.RequestAborted);
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