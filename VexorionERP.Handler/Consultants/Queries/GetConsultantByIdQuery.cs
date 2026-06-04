using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetConsultantByIdQuery(Guid ConsultantId) : IRequest<ServiceResult<ConsultantDetailsResponse>>;
