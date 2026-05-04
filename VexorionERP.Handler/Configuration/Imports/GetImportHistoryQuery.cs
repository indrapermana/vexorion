using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetImportHistoryQuery(
    string? ImportType,
    int Page,
    int PageSize) : IRequest<ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>>;
