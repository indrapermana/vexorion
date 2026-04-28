using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController(
    ICommandService<Department> departmentCommandService,
    IDepartmentQueryService departmentQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
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
        var result = await departmentCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<DepartmentDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { departmentId = mapped.Id }, mapped);
    }

    [HttpPut("{departmentId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<DepartmentDetailsResponse>> Update(Guid departmentId, [FromBody] UpdateDepartmentRequest request)
    {
        var result = await departmentCommandService.UpdateAsync(departmentId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{departmentId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid departmentId)
    {
        var result = await departmentCommandService.DeleteAsync(departmentId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<DepartmentDetailsResponse> MapResult(ServiceResult<IEntityResponse<Department>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<DepartmentDetailsResponse>();
            return ServiceResult<DepartmentDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<DepartmentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<DepartmentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
