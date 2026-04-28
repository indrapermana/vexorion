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
[Route("api/customer-payments")]
[Authorize]
public class CustomerPaymentsController(
    ICommandService<CustomerPayment> customerPaymentCommandService,
    IQueryService<CustomerPayment> customerPaymentQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>> GetAll()
    {
        var result = await customerPaymentQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{customerPaymentId:guid}")]
    [Authorize(Policy = AppPermissions.Sales.View)]
    public async Task<ActionResult<CustomerPaymentDetailsResponse>> GetById(Guid customerPaymentId)
    {
        var result = await customerPaymentQueryService.GetByIdAsync(customerPaymentId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Sales.Manage)]
    public async Task<ActionResult<CustomerPaymentDetailsResponse>> Create([FromBody] CreateCustomerPaymentRequest request)
    {
        var result = await customerPaymentCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(MapResult(result));
        var mapped = result.Value!.Adapt<CustomerPaymentDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { customerPaymentId = mapped.Id }, mapped);
    }

    private ServiceResult<CustomerPaymentDetailsResponse> MapResult(ServiceResult<IEntityResponse<CustomerPayment>> result)
    {
        if (result.Succeeded)
            return ServiceResult<CustomerPaymentDetailsResponse>.Success(result.Value!.Adapt<CustomerPaymentDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<CustomerPaymentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<CustomerPaymentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }

    private ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<CustomerPayment>>> result)
    {
        if (result.Succeeded)
            return ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>.Success(result.Value!.Adapt<IReadOnlyCollection<CustomerPaymentListItemResponse>>());
        if (result.Validation is not null)
            return ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }
}
