using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Finance.Periods;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Identity;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/fiscal-periods")]
[Authorize]
public class FiscalPeriodsController(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var periods = await dbContext.FiscalPeriods
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.StartDate)
            .Select(x => new FiscalPeriodListItemResponse
            {
                Id = x.Id,
                PeriodCode = x.PeriodCode,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsClosed = x.IsClosed,
            })
            .ToListAsync(cancellationToken);

        return Ok(periods);
    }

    [HttpGet("{fiscalPeriodId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<FiscalPeriodDetailsResponse>> GetById(Guid fiscalPeriodId, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var period = await dbContext.FiscalPeriods
            .Where(x => x.TenantId == tenantId && x.Id == fiscalPeriodId)
            .Select(x => new FiscalPeriodDetailsResponse
            {
                Id = x.Id,
                PeriodCode = x.PeriodCode,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsClosed = x.IsClosed,
                ClosedAtUtc = x.ClosedAtUtc,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (period is null)
            return NotFound();

        return Ok(period);
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

    [HttpPut("{fiscalPeriodId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<FiscalPeriodDetailsResponse>> Update(Guid fiscalPeriodId, [FromBody] UpdateFiscalPeriodRequest request, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        if (string.IsNullOrWhiteSpace(request.PeriodCode))
            return BadRequest(new { message = "Period code is required." });

        if (request.EndDate < request.StartDate)
            return BadRequest(new { message = "End date must be greater than or equal to start date." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var period = await dbContext.FiscalPeriods.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == fiscalPeriodId, cancellationToken);
        if (period is null)
            return NotFound();

        var normalizedCode = request.PeriodCode.Trim().ToUpperInvariant();
        if (await dbContext.FiscalPeriods.AnyAsync(x => x.TenantId == tenantId && x.Id != fiscalPeriodId && x.PeriodCode.ToUpper() == normalizedCode, cancellationToken))
            return Conflict(new { message = "A fiscal period with the same code already exists." });

        period.PeriodCode = normalizedCode;
        period.StartDate = request.StartDate;
        period.EndDate = request.EndDate;
        period.IsClosed = request.IsClosed;
        period.ClosedAtUtc = request.IsClosed ? (period.ClosedAtUtc ?? DateTime.UtcNow) : null;
        period.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDetails(period));
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
