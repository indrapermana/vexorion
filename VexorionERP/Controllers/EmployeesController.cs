using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController(
    ICommandService<Employee> employeeCommandService,
    IEmployeeQueryService employeeQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
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
        var result = await employeeCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<EmployeeDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { employeeId = mapped.Id }, mapped);
    }

    [HttpPut("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<EmployeeDetailsResponse>> Update(Guid employeeId, [FromBody] UpdateEmployeeRequest request)
    {
        var result = await employeeCommandService.UpdateAsync(employeeId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid employeeId)
    {
        var result = await employeeCommandService.DeleteAsync(employeeId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<EmployeeDetailsResponse> MapResult(ServiceResult<IEntityResponse<Employee>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<EmployeeDetailsResponse>();
            return ServiceResult<EmployeeDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<EmployeeDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<EmployeeDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
