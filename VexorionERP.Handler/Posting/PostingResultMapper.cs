using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

internal static class PostingResultMapper
{
    public static ServiceResult<JournalEntryDetailsResponse> ToServiceResult(ServiceResult<JournalEntry> result)
    {
        if (!result.Succeeded)
        {
            if (result.Validation is not null)
                return ServiceResult<JournalEntryDetailsResponse>.ValidationFailure(
                    result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
            return ServiceResult<JournalEntryDetailsResponse>.Failure(
                result.StatusCode ?? StatusCodes.Status400BadRequest,
                result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var journalEntry = result.Value!;
        return ServiceResult<JournalEntryDetailsResponse>.Success(new JournalEntryDetailsResponse
        {
            Id = journalEntry.Id,
            JournalNumber = journalEntry.JournalNumber,
            SourceDocumentType = journalEntry.SourceDocumentType,
            SourceDocumentId = journalEntry.SourceDocumentId,
            PostingDate = journalEntry.PostingDate,
            FiscalPeriodId = journalEntry.FiscalPeriodId,
            Status = journalEntry.Status,
            TotalDebit = journalEntry.TotalDebit,
            TotalCredit = journalEntry.TotalCredit,
            ReversedJournalEntryId = journalEntry.ReversedJournalEntryId,
            Description = journalEntry.Description,
            Lines = journalEntry.Lines
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
        });
    }
}
