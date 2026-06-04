using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteConsultantCommand(Guid ConsultantId) : IRequest<ServiceResult<bool>>;
