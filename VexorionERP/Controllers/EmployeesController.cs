using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<EmployeeListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetEmployeesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<EmployeeDetailsResponse>> GetById(Guid employeeId)
    {
        var result = await mediator.Send(new GetEmployeeByIdQuery(employeeId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<EmployeeDetailsResponse>> Create([FromBody] CreateEmployeeRequest request)
    {
        var result = await mediator.Send(new CreateEmployeeCommand(request), HttpContext.RequestAborted);
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
        var result = await mediator.Send(new UpdateEmployeeCommand(employeeId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{employeeId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid employeeId)
    {
        var result = await mediator.Send(new DeleteEmployeeCommand(employeeId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
