using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController(
    ICommandService<Customer> customerCommandService,
    ICustomerQueryService customerQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
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
        var result = await customerCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<CustomerDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { customerId = mapped.Id }, mapped);
    }

    [HttpPut("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult<CustomerDetailsResponse>> Update(Guid customerId, [FromBody] UpdateCustomerRequest request)
    {
        var result = await customerCommandService.UpdateAsync(customerId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{customerId:guid}")]
    [Authorize(Policy = AppPermissions.Customers.Manage)]
    public async Task<ActionResult> Delete(Guid customerId)
    {
        var result = await customerCommandService.DeleteAsync(customerId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<CustomerDetailsResponse> MapResult(ServiceResult<IEntityResponse<Customer>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<CustomerDetailsResponse>();
            return ServiceResult<CustomerDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<CustomerDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<CustomerDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
