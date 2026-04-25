using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Billing.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController(
    IInvoiceCommandService invoiceCommandService,
    IInvoiceQueryService invoiceQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceListItemResponse>>> GetAll()
    {
        var result = await invoiceQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<InvoiceDetailsResponse>> GetById(Guid invoiceId)
    {
        var result = await invoiceQueryService.GetByIdAsync(invoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceDetailsResponse>> Create([FromBody] CreateInvoiceRequest request)
    {
        var result = await invoiceCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { invoiceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<InvoiceDetailsResponse>> Update(Guid invoiceId, [FromBody] UpdateInvoiceRequest request)
    {
        var result = await invoiceCommandService.UpdateAsync(invoiceId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult> Delete(Guid invoiceId)
    {
        var result = await invoiceCommandService.DeleteAsync(invoiceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}