using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteCompanyCommand(Guid CompanyId) : IRequest<ServiceResult<bool>>;
