using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/sales-invoices")]
[Authorize]
public class SalesInvoicesController(
    ISalesInvoiceCommandService salesInvoiceCommandService,
    ISalesInvoiceQueryService salesInvoiceQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAll([FromQuery] bool outstandingOnly = false)
    {
        var result = await salesInvoiceQueryService.GetAllAsync(outstandingOnly, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> GetById(Guid salesInvoiceId)
    {
        var result = await salesInvoiceQueryService.GetByIdAsync(salesInvoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Create([FromBody] CreateSalesInvoiceRequest request)
    {
        var result = await salesInvoiceCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { salesInvoiceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Update(Guid salesInvoiceId, [FromBody] UpdateSalesInvoiceRequest request)
    {
        var result = await salesInvoiceCommandService.UpdateAsync(salesInvoiceId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesInvoiceId)
    {
        var result = await salesInvoiceCommandService.DeleteAsync(salesInvoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
