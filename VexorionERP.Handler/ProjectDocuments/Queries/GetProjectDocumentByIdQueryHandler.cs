using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProjectDocumentByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetProjectDocumentByIdQuery, ProjectDocument, ProjectDocumentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetProjectDocumentByIdQuery request) => request.DocumentId;
}
