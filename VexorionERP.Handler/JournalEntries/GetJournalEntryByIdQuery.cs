using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetJournalEntryByIdQuery(Guid JournalEntryId) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
