using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/fiscal-periods")]
[Authorize]
public class FiscalPeriodsController(
    IMediator mediator,
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetFiscalPeriodsQuery(), cancellationToken);
        return ToActionResult(result);
    }

    [HttpGet("{fiscalPeriodId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<FiscalPeriodDetailsResponse>> GetById(Guid fiscalPeriodId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetFiscalPeriodByIdQuery(fiscalPeriodId), cancellationToken);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<FiscalPeriodDetailsResponse>> Create([FromBody] CreateFiscalPeriodRequest request, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        if (string.IsNullOrWhiteSpace(request.PeriodCode))
            return BadRequest(new { message = "Period code is required." });

        if (request.EndDate < request.StartDate)
            return BadRequest(new { message = "End date must be greater than or equal to start date." });

        var tenantId = currentTenantProvider.TenantId.Value;
        var normalizedCode = request.PeriodCode.Trim().ToUpperInvariant();

        if (await dbContext.FiscalPeriods.AnyAsync(x => x.TenantId == tenantId && x.PeriodCode.ToUpper() == normalizedCode, cancellationToken))
            return Conflict(new { message = "A fiscal period with the same code already exists." });

        var period = new FiscalPeriod
        {
            TenantId = tenantId,
            PeriodCode = normalizedCode,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsClosed = request.IsClosed,
            ClosedAtUtc = request.IsClosed ? DateTime.UtcNow : null,
        };

        dbContext.FiscalPeriods.Add(period);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { fiscalPeriodId = period.Id }, ToDetails(period));
    }

    [HttpPost("{fiscalPeriodId:guid}/close")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<FiscalPeriodDetailsResponse>> Close(Guid fiscalPeriodId, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;
        var period = await dbContext.FiscalPeriods.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == fiscalPeriodId, cancellationToken);
        if (period is null)
            return NotFound();

        period.IsClosed = true;
        period.ClosedAtUtc = period.ClosedAtUtc ?? DateTime.UtcNow;
        period.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDetails(period));
    }

    [HttpPost("{fiscalPeriodId:guid}/reopen")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<FiscalPeriodDetailsResponse>> Reopen(Guid fiscalPeriodId, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;
        var period = await dbContext.FiscalPeriods.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == fiscalPeriodId, cancellationToken);
        if (period is null)
            return NotFound();

        period.IsClosed = false;
        period.ClosedAtUtc = null;
        period.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDetails(period));
    }

    private static FiscalPeriodDetailsResponse ToDetails(FiscalPeriod period) => new()
    {
        Id = period.Id,
        PeriodCode = period.PeriodCode,
        StartDate = period.StartDate,
        EndDate = period.EndDate,
        IsClosed = period.IsClosed,
        ClosedAtUtc = period.ClosedAtUtc,
    };
}
