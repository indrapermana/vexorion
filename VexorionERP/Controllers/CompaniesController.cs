using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Organization.Companies;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompaniesController(
    ICompanyCommandService companyCommandService,
    ICompanyQueryService companyQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<CompanyListItemResponse>>> GetAll()
    {
        var result = await companyQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<CompanyDetailsResponse>> GetById(Guid companyId)
    {
        var result = await companyQueryService.GetByIdAsync(companyId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<CompanyDetailsResponse>> Create([FromBody] CreateCompanyRequest request)
    {
        var result = await companyCommandService.CreateAsync(request, HttpContext.RequestAborted);
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
        var result = await companyCommandService.UpdateAsync(companyId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid companyId)
    {
        var result = await companyCommandService.DeleteAsync(companyId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}