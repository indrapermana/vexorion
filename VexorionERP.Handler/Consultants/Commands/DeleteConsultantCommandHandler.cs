using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteConsultantCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteConsultantCommand, Consultant>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteConsultantCommand request) => request.ConsultantId;
}
