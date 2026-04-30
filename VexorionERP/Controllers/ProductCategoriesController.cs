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
public class ProductCategoriesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductCategoryListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetProductCategoriesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<ProductCategoryDetailsResponse>> GetById(Guid categoryId)
    {
        var result = await mediator.Send(new GetProductCategoryByIdQuery(categoryId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductCategoryDetailsResponse>> Create([FromBody] CreateProductCategoryRequest request)
    {
        var result = await mediator.Send(new CreateProductCategoryCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { categoryId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductCategoryDetailsResponse>> Update(Guid categoryId, [FromBody] UpdateProductCategoryRequest request)
    {
        var result = await mediator.Send(new UpdateProductCategoryCommand(categoryId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult> Delete(Guid categoryId)
    {
        var result = await mediator.Send(new DeleteProductCategoryCommand(categoryId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
