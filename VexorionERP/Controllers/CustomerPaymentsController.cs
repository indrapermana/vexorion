using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Sales.Payments;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/customer-payments")]
[Authorize]
public class CustomerPaymentsController(
    ICustomerPaymentCommandService customerPaymentCommandService,
    ICustomerPaymentQueryService customerPaymentQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>> GetAll()
    {
        var result = await customerPaymentQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{customerPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<CustomerPaymentDetailsResponse>> GetById(Guid customerPaymentId)
    {
        var result = await customerPaymentQueryService.GetByIdAsync(customerPaymentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<CustomerPaymentDetailsResponse>> Create([FromBody] CreateCustomerPaymentRequest request)
    {
        var result = await customerPaymentCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { customerPaymentId = result.Value!.Id }, result.Value);
    }
}