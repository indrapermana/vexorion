using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompaniesController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<CompanyListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetCompaniesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<CompanyDetailsResponse>> GetById(Guid companyId)
    {
        var result = await mediator.Send(new GetCompanyByIdQuery(companyId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<CompanyDetailsResponse>> Create([FromBody] CreateCompanyRequest request)
    {
        var result = await mediator.Send(new CreateCompanyCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { companyId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<CompanyDetailsResponse>> Update(Guid companyId, [FromBody] UpdateCompanyRequest request)
    {
        var result = await mediator.Send(new UpdateCompanyCommand(companyId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid companyId)
    {
        var result = await mediator.Send(new DeleteCompanyCommand(companyId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
