using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/vendor-payments")]
[Authorize]
public class VendorPaymentsController(
    ICommandService<VendorPayment> vendorPaymentCommandService,
    IQueryService<VendorPayment> vendorPaymentQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> GetAll()
    {
        var result = await vendorPaymentQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{vendorPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<VendorPaymentDetailsResponse>> GetById(Guid vendorPaymentId)
    {
        var result = await vendorPaymentQueryService.GetByIdAsync(vendorPaymentId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<VendorPaymentDetailsResponse>> Create([FromBody] CreateVendorPaymentRequest request)
    {
        var result = await vendorPaymentCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(MapResult(result));
        var mapped = result.Value!.Adapt<VendorPaymentDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { vendorPaymentId = mapped.Id }, mapped);
    }

    private ServiceResult<VendorPaymentDetailsResponse> MapResult(ServiceResult<IEntityResponse<VendorPayment>> result)
    {
        if (result.Succeeded)
            return ServiceResult<VendorPaymentDetailsResponse>.Success(result.Value!.Adapt<VendorPaymentDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<VendorPaymentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<VendorPaymentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }

    private ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<VendorPayment>>> result)
    {
        if (result.Succeeded)
            return ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>.Success(result.Value!.Adapt<IReadOnlyCollection<VendorPaymentListItemResponse>>());
        if (result.Validation is not null)
            return ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }
}
