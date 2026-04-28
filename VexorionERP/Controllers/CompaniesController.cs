using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompaniesController(
    ICommandService<Company> companyCommandService,
    IQueryService<Company> companyQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<CompanyListItemResponse>>> GetAll()
    {
        var result = await companyQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<CompanyDetailsResponse>> GetById(Guid companyId)
    {
        var result = await companyQueryService.GetByIdAsync(companyId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<CompanyDetailsResponse>> Create([FromBody] CreateCompanyRequest request)
    {
        var result = await companyCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<CompanyDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { companyId = mapped.Id }, mapped);
    }

    [HttpPut("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<CompanyDetailsResponse>> Update(Guid companyId, [FromBody] UpdateCompanyRequest request)
    {
        var result = await companyCommandService.UpdateAsync(companyId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{companyId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid companyId)
    {
        var result = await companyCommandService.DeleteAsync(companyId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<CompanyDetailsResponse> MapResult(ServiceResult<IEntityResponse<Company>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<CompanyDetailsResponse>();
            return ServiceResult<CompanyDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<CompanyDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<CompanyDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<CompanyListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<Company>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<CompanyListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
