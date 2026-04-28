using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController(
    ISupplierCommandService supplierCommandService,
    ISupplierQueryService supplierQueryService) : ServiceResultControllerBase
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
        var result = await supplierCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { supplierId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult<SupplierDetailsResponse>> Update(Guid supplierId, [FromBody] UpdateSupplierRequest request)
    {
        var result = await supplierCommandService.UpdateAsync(supplierId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult> Delete(Guid supplierId)
    {
        var result = await supplierCommandService.DeleteAsync(supplierId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
