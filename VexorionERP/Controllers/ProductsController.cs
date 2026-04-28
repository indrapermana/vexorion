using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(
    ICommandService<Product> productCommandService,
    IQueryService<Product> productQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductListItemResponse>>> GetAll()
    {
        var result = await productQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<ProductDetailsResponse>> GetById(Guid productId)
    {
        var result = await productQueryService.GetByIdAsync(productId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductDetailsResponse>> Create([FromBody] CreateProductRequest request)
    {
        var result = await productCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<ProductDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { productId = mapped.Id }, mapped);
    }

    [HttpPut("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductDetailsResponse>> Update(Guid productId, [FromBody] UpdateProductRequest request)
    {
        var result = await productCommandService.UpdateAsync(productId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult> Delete(Guid productId)
    {
        var result = await productCommandService.DeleteAsync(productId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<ProductDetailsResponse> MapResult(ServiceResult<IEntityResponse<Product>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<ProductDetailsResponse>();
            return ServiceResult<ProductDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<ProductDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<ProductDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<ProductListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<Product>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<ProductListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<ProductListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<ProductListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<ProductListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

}
