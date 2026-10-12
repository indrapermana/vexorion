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
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        if (string.IsNullOrWhiteSpace(request.PeriodCode))
            return ApiFailure(StatusCodes.Status400BadRequest, "Period code is required.", "fiscal_period.code_required");

        if (request.EndDate < request.StartDate)
            return ApiFailure(StatusCodes.Status400BadRequest, "End date must be greater than or equal to start date.", "fiscal_period.date_range_invalid");

        var tenantId = currentTenantProvider.TenantId.Value;
        var normalizedCode = request.PeriodCode.Trim().ToUpperInvariant();

        if (await dbContext.FiscalPeriods.AnyAsync(x => x.TenantId == tenantId && x.PeriodCode.ToUpper() == normalizedCode, cancellationToken))
            return ApiFailure(StatusCodes.Status409Conflict, "A fiscal period with the same code already exists.", "fiscal_period.code_conflict");

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
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var tenantId = currentTenantProvider.TenantId.Value;
        var period = await dbContext.FiscalPeriods.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == fiscalPeriodId, cancellationToken);
        if (period is null)
            return ApiFailure(StatusCodes.Status404NotFound, "Fiscal period not found.", "fiscal_period.not_found");

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
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var tenantId = currentTenantProvider.TenantId.Value;
        var period = await dbContext.FiscalPeriods.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == fiscalPeriodId, cancellationToken);
        if (period is null)
            return ApiFailure(StatusCodes.Status404NotFound, "Fiscal period not found.", "fiscal_period.not_found");

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
