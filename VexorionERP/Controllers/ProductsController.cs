using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Products;
using VexorionERP.Models.Identity;
using VexorionERP.Services;
using VexorionERP.Services.Results;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(
    IProductCommandService productCommandService,
    IProductQueryService productQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductListItemResponse>>> GetAll()
    {
        var result = await productQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<ProductDetailsResponse>> GetById(Guid productId)
    {
        var result = await productQueryService.GetByIdAsync(productId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductDetailsResponse>> Create([FromBody] CreateProductRequest request)
    {
        var result = await productCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { productId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductDetailsResponse>> Update(Guid productId, [FromBody] UpdateProductRequest request)
    {
        var result = await productCommandService.UpdateAsync(productId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{productId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult> Delete(Guid productId)
    {
        var result = await productCommandService.DeleteAsync(productId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

}