using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetProductsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<ProductDetailsResponse>> GetById(Guid productId)
    {
        var result = await mediator.Send(new GetProductByIdQuery(productId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductDetailsResponse>> Create([FromBody] CreateProductRequest request)
    {
        var result = await mediator.Send(new CreateProductCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { productId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductDetailsResponse>> Update(Guid productId, [FromBody] UpdateProductRequest request)
    {
        var result = await mediator.Send(new UpdateProductCommand(productId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult> Delete(Guid productId)
    {
        var result = await mediator.Send(new DeleteProductCommand(productId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
