using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/tenant-relationships")]
[Authorize]
public class TenantRelationshipsController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Tenants.View)]
    public async Task<ActionResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetTenantRelationshipsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("active")]
    [Authorize(Policy = AppPermissions.Tenants.View)]
    public async Task<ActionResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>> GetActive()
    {
        var result = await mediator.Send(new GetActiveTenantRelationshipsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{relationshipId:guid}")]
    [Authorize(Policy = AppPermissions.Tenants.View)]
    public async Task<ActionResult<TenantRelationshipDetailsResponse>> GetById(Guid relationshipId)
    {
        var result = await mediator.Send(new GetTenantRelationshipByIdQuery(relationshipId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult<TenantRelationshipDetailsResponse>> Create([FromBody] CreateTenantRelationshipRequest request)
    {
        var result = await mediator.Send(new CreateTenantRelationshipCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { relationshipId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{relationshipId:guid}")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult<TenantRelationshipDetailsResponse>> Update(Guid relationshipId, [FromBody] UpdateTenantRelationshipRequest request)
    {
        var result = await mediator.Send(new UpdateTenantRelationshipCommand(relationshipId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{relationshipId:guid}/activate")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult<TenantRelationshipDetailsResponse>> Activate(Guid relationshipId, [FromBody] ActivateTenantRelationshipRequest request)
    {
        var result = await mediator.Send(new ActivateTenantRelationshipCommand(relationshipId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{relationshipId:guid}")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult> Delete(Guid relationshipId)
    {
        var result = await mediator.Send(new DeleteTenantRelationshipCommand(relationshipId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}