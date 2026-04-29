using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetJournalEntryByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetJournalEntryByIdQuery, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(GetJournalEntryByIdQuery request, CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
            return ServiceResult<JournalEntryDetailsResponse>.Failure(400, "Tenant context is required.");

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantId = tenantProvider.TenantId.Value;

        var journal = await dbContext.JournalEntries
            .AsNoTracking()
            .Include(x => x.Lines)
                .ThenInclude(x => x.Account)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == request.JournalEntryId, cancellationToken);

        if (journal is null)
            return ServiceResult<JournalEntryDetailsResponse>.Failure(404, "Journal entry not found.");

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

        return ServiceResult<JournalEntryDetailsResponse>.Success(response);
    }
}
