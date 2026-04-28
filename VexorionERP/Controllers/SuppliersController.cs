using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController(
    ICommandService<Supplier> supplierCommandService,
    ISupplierQueryService supplierQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Suppliers.View)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierListItemResponse>>> GetAll()
    {
        var result = await supplierQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.View)]
    public async Task<ActionResult<SupplierDetailsResponse>> GetById(Guid supplierId)
    {
        var result = await supplierQueryService.GetByIdAsync(supplierId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult<SupplierDetailsResponse>> Create([FromBody] CreateSupplierRequest request)
    {
        var result = await supplierCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<SupplierDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { supplierId = mapped.Id }, mapped);
    }

    [HttpPut("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult<SupplierDetailsResponse>> Update(Guid supplierId, [FromBody] UpdateSupplierRequest request)
    {
        var result = await supplierCommandService.UpdateAsync(supplierId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult> Delete(Guid supplierId)
    {
        var result = await supplierCommandService.DeleteAsync(supplierId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<SupplierDetailsResponse> MapResult(ServiceResult<IEntityResponse<Supplier>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SupplierDetailsResponse>();
            return ServiceResult<SupplierDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SupplierDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SupplierDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
