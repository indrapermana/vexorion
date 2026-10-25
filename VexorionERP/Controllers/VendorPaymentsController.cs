using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/vendor-payments")]
[Authorize]
public class VendorPaymentsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> GetAll([FromQuery] Guid? purchaseInvoiceId)
    {
        var result = await mediator.Send(new GetVendorPaymentsQuery(purchaseInvoiceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{vendorPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Purchasing.View)]
    public async Task<ActionResult<VendorPaymentDetailsResponse>> GetById(Guid vendorPaymentId)
    {
        var result = await mediator.Send(new GetVendorPaymentByIdQuery(vendorPaymentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Purchasing.Manage)]
    public async Task<ActionResult<VendorPaymentDetailsResponse>> Create([FromBody] CreateVendorPaymentRequest request)
    {
        var result = await mediator.Send(new CreateVendorPaymentCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { vendorPaymentId = result.Value!.Id }, result.Value);
    }
}
