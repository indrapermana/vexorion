using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/product-categories")]
[Authorize]
public class ProductCategoriesController(IMediator mediator, ITenantMemoryCache tenantMemoryCache) : ServiceResultControllerBase
{
    private const string CacheArea = "product-categories";

    [HttpGet]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductCategoryListItemResponse>>> GetAll()
    {
        if (tenantMemoryCache.TryGetValue<IReadOnlyCollection<ProductCategoryListItemResponse>>(CacheArea, "all", out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetProductCategoriesQuery(), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, "all", result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpGet("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<ProductCategoryDetailsResponse>> GetById(Guid categoryId)
    {
        var detailsKey = $"details:{categoryId}";
        if (tenantMemoryCache.TryGetValue<ProductCategoryDetailsResponse>(CacheArea, detailsKey, out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetProductCategoryByIdQuery(categoryId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, detailsKey, result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductCategoryDetailsResponse>> Create([FromBody] CreateProductCategoryRequest request)
    {
        var result = await mediator.Send(new CreateProductCategoryCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        tenantMemoryCache.Remove(CacheArea, "all");

        return CreatedAtAction(nameof(GetById), new { categoryId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductCategoryDetailsResponse>> Update(Guid categoryId, [FromBody] UpdateProductCategoryRequest request)
    {
        var result = await mediator.Send(new UpdateProductCategoryCommand(categoryId, request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        tenantMemoryCache.Remove(CacheArea, "all");
        tenantMemoryCache.Remove(CacheArea, $"details:{categoryId}");
        return Ok(result.Value);
    }

    [HttpDelete("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult> Delete(Guid categoryId)
    {
        var result = await mediator.Send(new DeleteProductCategoryCommand(categoryId), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        tenantMemoryCache.Remove(CacheArea, "all");
        tenantMemoryCache.Remove(CacheArea, $"details:{categoryId}");
        return NoContent();
    }
}
