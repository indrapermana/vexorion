using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController(
    IEmployeeCommandService employeeCommandService,
    IEmployeeQueryService employeeQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<EmployeeListItemResponse>>> GetAll()
    {
        var result = await employeeQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<EmployeeDetailsResponse>> GetById(Guid employeeId)
    {
        var result = await employeeQueryService.GetByIdAsync(employeeId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<EmployeeDetailsResponse>> Create([FromBody] CreateEmployeeRequest request)
    {
        var result = await employeeCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { employeeId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<EmployeeDetailsResponse>> Update(Guid employeeId, [FromBody] UpdateEmployeeRequest request)
    {
        var result = await employeeCommandService.UpdateAsync(employeeId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid employeeId)
    {
        var result = await employeeCommandService.DeleteAsync(employeeId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
