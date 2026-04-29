using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetJournalEntriesQuery : IRequest<ServiceResult<IReadOnlyCollection<JournalEntryListItemResponse>>>;
