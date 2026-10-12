using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record SearchProjectDocumentsQuery(ProjectDocumentSearchFilterRequest Filter)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>>;
