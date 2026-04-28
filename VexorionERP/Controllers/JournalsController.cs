using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/journals")]
[Authorize]
public class JournalsController(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<JournalEntryListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var journals = await dbContext.JournalEntries
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.PostingDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new JournalEntryListItemResponse
            {
                Id = x.Id,
                JournalNumber = x.JournalNumber,
                SourceDocumentType = x.SourceDocumentType,
                SourceDocumentId = x.SourceDocumentId,
                PostingDate = x.PostingDate,
                Status = x.Status,
                TotalDebit = x.TotalDebit,
                TotalCredit = x.TotalCredit,
            })
            .ToListAsync(cancellationToken);

        return Ok(journals);
    }

    [HttpGet("{journalEntryId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> GetById(Guid journalEntryId, CancellationToken cancellationToken)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return BadRequest(new { message = "Tenant context is required." });

        var tenantId = currentTenantProvider.TenantId.Value;

        var journal = await dbContext.JournalEntries
            .Include(x => x.Lines)
                .ThenInclude(x => x.Account)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == journalEntryId, cancellationToken);

        if (journal is null)
            return NotFound();

        var response = new JournalEntryDetailsResponse
        {
            Id = journal.Id,
            JournalNumber = journal.JournalNumber,
            SourceDocumentType = journal.SourceDocumentType,
            SourceDocumentId = journal.SourceDocumentId,
            PostingDate = journal.PostingDate,
            FiscalPeriodId = journal.FiscalPeriodId,
            Status = journal.Status,
            TotalDebit = journal.TotalDebit,
            TotalCredit = journal.TotalCredit,
            ReversedJournalEntryId = journal.ReversedJournalEntryId,
            Description = journal.Description,
            Lines = journal.Lines
                .OrderBy(x => x.LineNumber)
                .Select(x => new JournalEntryLineResponse
                {
                    Id = x.Id,
                    AccountId = x.AccountId,
                    AccountCode = x.Account?.Code ?? string.Empty,
                    AccountName = x.Account?.Name ?? string.Empty,
                    LineNumber = x.LineNumber,
                    Description = x.Description,
                    DebitAmount = x.DebitAmount,
                    CreditAmount = x.CreditAmount,
                })
                .ToList(),
        };

        return Ok(response);
    }
}
