using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record PostManualJournalCommand(Guid JournalEntryId) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
