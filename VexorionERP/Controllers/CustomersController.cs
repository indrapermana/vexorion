using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Customers.View)]
    public async Task<ActionResult<IReadOnlyCollection<CustomerListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetCustomersQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.View)]
    public async Task<ActionResult<CustomerDetailsResponse>> GetById(Guid customerId)
    {
        var result = await mediator.Send(new GetCustomerByIdQuery(customerId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult<CustomerDetailsResponse>> Create([FromBody] CreateCustomerRequest request)
    {
        var result = await mediator.Send(new CreateCustomerCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { customerId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult<CustomerDetailsResponse>> Update(Guid customerId, [FromBody] UpdateCustomerRequest request)
    {
        var result = await mediator.Send(new UpdateCustomerCommand(customerId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult> Delete(Guid customerId)
    {
        var result = await mediator.Send(new DeleteCustomerCommand(customerId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
