using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetConsultantsQuery() : IRequest<ServiceResult<IReadOnlyCollection<ConsultantListItemResponse>>>;
