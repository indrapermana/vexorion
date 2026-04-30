using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Roles.View)]
    public async Task<ActionResult<IReadOnlyCollection<RolePermissionsResponse>>> GetRolePermissions()
    {
        var result = await mediator.Send(new GetRolePermissionsQuery());
        return ToActionResult(result);
    }

    [HttpPut("users/{userId:guid}")]
    [Authorize(Policy = AppPermissions.Roles.Manage)]
    public async Task<ActionResult> AssignUserRoles(Guid userId, [FromBody] AssignUserRolesRequest request)
    {
        var result = await mediator.Send(new AssignUserRolesCommand(userId, request));
        return ToActionResult(result);
    }
}
