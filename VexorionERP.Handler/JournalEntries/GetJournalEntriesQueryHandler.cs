using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetJournalEntriesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetJournalEntriesQuery, ServiceResult<IReadOnlyCollection<JournalEntryListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<JournalEntryListItemResponse>>> Handle(GetJournalEntriesQuery request, CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<JournalEntryListItemResponse>>.Failure(400, "Tenant context is required.");

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantId = tenantProvider.TenantId.Value;

        var journals = await dbContext.JournalEntries
            .AsNoTracking()
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
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<JournalEntryListItemResponse>>.Success(journals);
    }
}
