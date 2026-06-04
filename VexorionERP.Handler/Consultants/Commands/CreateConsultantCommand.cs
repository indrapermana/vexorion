using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateConsultantCommand(CreateConsultantRequest Request) : IRequest<ServiceResult<ConsultantDetailsResponse>>;
