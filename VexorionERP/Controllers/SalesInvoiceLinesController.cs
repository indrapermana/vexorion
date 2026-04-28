using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-invoices/{salesInvoiceId:guid}/lines")]
[Authorize]
public class SalesInvoiceLinesController(
    ISalesInvoiceLineCommandService salesInvoiceLineCommandService,
    ISalesInvoiceLineQueryService salesInvoiceLineQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>> GetAll(Guid salesInvoiceId)
    {
        var result = await salesInvoiceLineQueryService.GetAllAsync(salesInvoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> GetById(Guid salesInvoiceId, Guid salesInvoiceLineId)
    {
        var result = await salesInvoiceLineQueryService.GetByIdAsync(salesInvoiceId, salesInvoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> Create(Guid salesInvoiceId, [FromBody] CreateSalesInvoiceLineRequest request)
    {
        var result = await salesInvoiceLineCommandService.CreateAsync(salesInvoiceId, request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesInvoiceId, salesInvoiceLineId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceLineDetailsResponse>> Update(Guid salesInvoiceId, Guid salesInvoiceLineId, [FromBody] UpdateSalesInvoiceLineRequest request)
    {
        var result = await salesInvoiceLineCommandService.UpdateAsync(salesInvoiceId, salesInvoiceLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesInvoiceLineId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesInvoiceId, Guid salesInvoiceLineId)
    {
        var result = await salesInvoiceLineCommandService.DeleteAsync(salesInvoiceId, salesInvoiceLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
