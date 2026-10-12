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

    [HttpGet("{productId:guid}/purchase-price-history")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>> GetPurchasePriceHistory(Guid productId)
    {
        var result = await mediator.Send(new GetProductPurchasePriceHistoryQuery(productId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{productId:guid}/purchase-price-history/entries")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>> GetPurchasePriceHistoryEntries(
        Guid productId,
        [FromQuery] Guid? supplierId = null,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var result = await mediator.Send(
            new GetProductPurchasePriceHistoryEntriesQuery(productId, supplierId, fromDate, toDate),
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{productId:guid}/purchase-price-history/summary")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>> GetPurchasePriceSummary(
        Guid productId,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var result = await mediator.Send(
            new GetProductPurchasePriceSummaryQuery(productId, fromDate, toDate),
            HttpContext.RequestAborted);
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

    [HttpPost("{productId:guid}/image")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ProductImageUploadResponse>> UploadImage(Guid productId, [FromForm] IFormFile file)
    {
        if (file is null)
        {
            return ApiFailure(StatusCodes.Status400BadRequest, "Image file is required.", "product.image_required");
        }

        await using var stream = file.OpenReadStream();
        await using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, HttpContext.RequestAborted);

        var result = await mediator.Send(new UploadProductImageCommand(
            productId,
            file.FileName,
            file.ContentType,
            memory.ToArray()), HttpContext.RequestAborted);

        return ToActionResult(result);
    }
}
