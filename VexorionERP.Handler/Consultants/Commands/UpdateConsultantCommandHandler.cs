using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateConsultantCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateConsultantCommand, Consultant, UpdateConsultantRequest, ConsultantDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateConsultantCommand request) => request.ConsultantId;

    protected override UpdateConsultantRequest GetUpdateRequest(UpdateConsultantCommand request) => request.Request;
}
