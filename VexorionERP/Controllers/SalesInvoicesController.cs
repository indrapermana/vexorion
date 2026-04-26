using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VexorionERP.Contracts.Finance.Approvals;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/sales-invoices")]
[Authorize]
public class SalesInvoicesController(
    ISalesInvoiceCommandService salesInvoiceCommandService,
    ISalesInvoiceQueryService salesInvoiceQueryService,
    IInvoiceApprovalService invoiceApprovalService) : ServiceResultControllerBase
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

    [HttpPost("{salesInvoiceId:guid}/approval/request")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> RequestApproval(Guid salesInvoiceId, [FromBody] ApprovalActionRequest request)
    {
        var result = await invoiceApprovalService.RequestSalesInvoiceApprovalAsync(
            salesInvoiceId,
            TryGetActorUserId(),
            request.Comment,
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{salesInvoiceId:guid}/approval/approve")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Approve(Guid salesInvoiceId, [FromBody] ApprovalActionRequest request)
    {
        var result = await invoiceApprovalService.ApproveSalesInvoiceAsync(
            salesInvoiceId,
            TryGetActorUserId(),
            request.Comment,
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{salesInvoiceId:guid}/approval/reject")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Reject(Guid salesInvoiceId, [FromBody] ApprovalActionRequest request)
    {
        var result = await invoiceApprovalService.RejectSalesInvoiceAsync(
            salesInvoiceId,
            TryGetActorUserId(),
            request.Comment,
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private Guid? TryGetActorUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
