using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Purchasing.Payments;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/vendor-payments")]
[Authorize]
public class VendorPaymentsController(
    IVendorPaymentCommandService vendorPaymentCommandService,
    IVendorPaymentQueryService vendorPaymentQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> GetAll()
    {
        var result = await vendorPaymentQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{vendorPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<VendorPaymentDetailsResponse>> GetById(Guid vendorPaymentId)
    {
        var result = await vendorPaymentQueryService.GetByIdAsync(vendorPaymentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<VendorPaymentDetailsResponse>> Create([FromBody] CreateVendorPaymentRequest request)
    {
        var result = await vendorPaymentCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { vendorPaymentId = result.Value!.Id }, result.Value);
    }
}