using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController(
    IDepartmentCommandService departmentCommandService,
    IDepartmentQueryService departmentQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<DepartmentListItemResponse>>> GetAll()
    {
        var result = await departmentQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{departmentId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<DepartmentDetailsResponse>> GetById(Guid departmentId)
    {
        var result = await departmentQueryService.GetByIdAsync(departmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<DepartmentDetailsResponse>> Create([FromBody] CreateDepartmentRequest request)
    {
        var result = await departmentCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { departmentId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{departmentId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<DepartmentDetailsResponse>> Update(Guid departmentId, [FromBody] UpdateDepartmentRequest request)
    {
        var result = await departmentCommandService.UpdateAsync(departmentId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{departmentId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid departmentId)
    {
        var result = await departmentCommandService.DeleteAsync(departmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
