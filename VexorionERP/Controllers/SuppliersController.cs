using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Suppliers.View)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetSuppliersQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.View)]
    public async Task<ActionResult<SupplierDetailsResponse>> GetById(Guid supplierId)
    {
        var result = await mediator.Send(new GetSupplierByIdQuery(supplierId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult<SupplierDetailsResponse>> Create([FromBody] CreateSupplierRequest request)
    {
        var result = await mediator.Send(new CreateSupplierCommand(request), HttpContext.RequestAborted);
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
        var result = await mediator.Send(new UpdateSupplierCommand(supplierId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{supplierId:guid}")]
    [Authorize(Policy = AppPermissions.Suppliers.Manage)]
    public async Task<ActionResult> Delete(Guid supplierId)
    {
        var result = await mediator.Send(new DeleteSupplierCommand(supplierId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
