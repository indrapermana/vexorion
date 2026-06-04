using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateConsultantCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateConsultantCommand, Consultant, CreateConsultantRequest, ConsultantDetailsResponse>(serviceProvider)
{
    protected override CreateConsultantRequest GetCreateRequest(CreateConsultantCommand request) => request.Request;
}
