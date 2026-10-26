using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-reports")]
[Authorize]
public sealed class InventoryReportsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet("valuation")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    [EndpointSummary("Get current inventory valuation")]
    [EndpointDescription("Values current on-hand quantities at each product's current standard cost and reports the variance against net movement history.")]
    [ProducesResponseType(typeof(InventoryValuationReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryValuationReportResponse>> GetValuation([FromQuery] Guid? warehouseId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetInventoryValuationQuery(warehouseId), cancellationToken);
        return ToActionResult(result);
    }

    [HttpGet("movement-audit")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    [EndpointSummary("Review inventory movement history")]
    [EndpointDescription("Returns tenant-scoped movement entries filtered by date, warehouse, and product, ordered newest first.")]
    [ProducesResponseType(typeof(InventoryMovementAuditResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryMovementAuditResponse>> GetMovementAudit(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] Guid? warehouseId,
        [FromQuery] Guid? productId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(new GetInventoryMovementAuditQuery(startDate, endDate, warehouseId, productId, skip, take), cancellationToken);
        return ToActionResult(result);
    }

    [HttpGet("reorder-recommendations")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    [EndpointSummary("Get inventory reorder recommendations")]
    [EndpointDescription("Lists active products at or below their reorder level using available stock in active warehouses.")]
    [ProducesResponseType(typeof(InventoryReorderReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryReorderReportResponse>> GetReorderRecommendations(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetInventoryReorderRecommendationsQuery(), cancellationToken);
        return ToActionResult(result);
    }
}