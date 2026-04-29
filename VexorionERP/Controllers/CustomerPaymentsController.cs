using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/customer-payments")]
[Authorize]
public class CustomerPaymentsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetCustomerPaymentsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{customerPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<CustomerPaymentDetailsResponse>> GetById(Guid customerPaymentId)
    {
        var result = await mediator.Send(new GetCustomerPaymentByIdQuery(customerPaymentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<CustomerPaymentDetailsResponse>> Create([FromBody] CreateCustomerPaymentRequest request)
    {
        var result = await mediator.Send(new CreateCustomerPaymentCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { customerPaymentId = result.Value!.Id }, result.Value);
    }
}
