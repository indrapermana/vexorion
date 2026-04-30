using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/product-identifiers")]
[Authorize]
public class ProductIdentifiersController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProductIdentifierListItemResponse>>> GetByProduct([FromQuery] Guid productId)
    {
        var result = await mediator.Send(new GetProductIdentifiersQuery(productId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{identifierId:guid}")]
    [Authorize(Policy = AppPermissions.Products.View)]
    public async Task<ActionResult<ProductIdentifierDetailsResponse>> GetById(Guid identifierId)
    {
        var result = await mediator.Send(new GetProductIdentifierByIdQuery(identifierId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductIdentifierDetailsResponse>> Create([FromBody] CreateProductIdentifierRequest request)
    {
        var result = await mediator.Send(new CreateProductIdentifierCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { identifierId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{identifierId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult<ProductIdentifierDetailsResponse>> Update(Guid identifierId, [FromBody] UpdateProductIdentifierRequest request)
    {
        var result = await mediator.Send(new UpdateProductIdentifierCommand(identifierId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{identifierId:guid}")]
    [Authorize(Policy = AppPermissions.Products.Manage)]
    public async Task<ActionResult> Delete(Guid identifierId)
    {
        var result = await mediator.Send(new DeleteProductIdentifierCommand(identifierId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
