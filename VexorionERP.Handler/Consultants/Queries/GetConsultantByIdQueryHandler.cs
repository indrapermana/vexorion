using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetConsultantByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetConsultantByIdQuery, Consultant, ConsultantDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetConsultantByIdQuery request) => request.ConsultantId;
}
