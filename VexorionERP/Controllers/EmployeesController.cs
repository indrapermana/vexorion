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
    IQueryService<Employee> employeeQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<EmployeeListItemResponse>>> GetAll()
    {
        var result = await employeeQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<EmployeeDetailsResponse>> GetById(Guid employeeId)
    {
        var result = await employeeQueryService.GetByIdAsync(employeeId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
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

    private ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<Employee>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<EmployeeListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
