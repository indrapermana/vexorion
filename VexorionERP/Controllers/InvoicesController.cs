using Microsoft.AspNetCore.Authorization;
using Mapster;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController(
    IInvoiceCommandService invoiceCommandService,
    IQueryService<Invoice> invoiceQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<InvoiceListItemResponse>>> GetAll()
    {
        var result = await invoiceQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{invoiceId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<InvoiceDetailsResponse>> GetById(Guid invoiceId)
    {
        var result = await invoiceQueryService.GetByIdAsync(invoiceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
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

    private ServiceResult<InvoiceDetailsResponse> MapResult(ServiceResult<IEntityResponse<Invoice>> result)
    {
        if (result.Succeeded)
            return ServiceResult<InvoiceDetailsResponse>.Success(result.Value!.Adapt<InvoiceDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<InvoiceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<InvoiceDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }

    private ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<Invoice>>> result)
    {
        if (result.Succeeded)
            return ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>.Success(result.Value!.Adapt<IReadOnlyCollection<InvoiceListItemResponse>>());
        if (result.Validation is not null)
            return ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }
}
