using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDepartmentByIdQuery(Guid DepartmentId) : IRequest<ServiceResult<DepartmentDetailsResponse>>;
