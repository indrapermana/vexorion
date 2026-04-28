using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/sales-invoices")]
[Authorize]
public class SalesInvoicesController(
    ICommandService<SalesInvoice> salesInvoiceCommandService,
    IFilteredQueryService<SalesInvoice, bool> salesInvoiceQueryService,
    AppDbContext dbContext,
    IInvoiceApprovalService invoiceApprovalService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAll([FromQuery] bool outstandingOnly = false)
    {
        var result = await salesInvoiceQueryService.GetAllAsync(outstandingOnly, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> GetById(Guid salesInvoiceId)
    {
        var result = await salesInvoiceQueryService.GetByIdAsync(salesInvoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Create([FromBody] CreateSalesInvoiceRequest request)
    {
        var result = await salesInvoiceCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<SalesInvoiceDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { salesInvoiceId = mapped.Id }, mapped);
    }

    [HttpPut("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<SalesInvoiceDetailsResponse>> Update(Guid salesInvoiceId, [FromBody] UpdateSalesInvoiceRequest request)
    {
        var result = await salesInvoiceCommandService.UpdateAsync(salesInvoiceId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{salesInvoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult> Delete(Guid salesInvoiceId)
    {
        var result = await salesInvoiceCommandService.DeleteAsync(salesInvoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<SalesInvoiceDetailsResponse> MapResult(ServiceResult<IEntityResponse<SalesInvoice>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesInvoiceDetailsResponse>();
            return ServiceResult<SalesInvoiceDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesInvoiceDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesInvoice>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<SalesInvoiceListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
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
