using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateConsultantCommand(Guid ConsultantId, UpdateConsultantRequest Request) : IRequest<ServiceResult<ConsultantDetailsResponse>>;
