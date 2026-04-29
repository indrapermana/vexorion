using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record ReverseJournalCommand(Guid JournalEntryId, ReverseJournalRequest Request) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
