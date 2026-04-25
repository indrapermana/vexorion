using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Partners.Customers;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController(
    ICustomerCommandService customerCommandService,
    ICustomerQueryService customerQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Customers.View)]
    public async Task<ActionResult<IReadOnlyCollection<CustomerListItemResponse>>> GetAll()
    {
        var result = await customerQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.View)]
    public async Task<ActionResult<CustomerDetailsResponse>> GetById(Guid customerId)
    {
        var result = await customerQueryService.GetByIdAsync(customerId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult<CustomerDetailsResponse>> Create([FromBody] CreateCustomerRequest request)
    {
        var result = await customerCommandService.CreateAsync(request, HttpContext.RequestAborted);
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
        var result = await customerCommandService.UpdateAsync(customerId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult> Delete(Guid customerId)
    {
        var result = await customerCommandService.DeleteAsync(customerId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}