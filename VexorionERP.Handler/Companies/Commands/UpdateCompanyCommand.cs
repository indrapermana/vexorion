using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateCompanyCommand(Guid CompanyId, UpdateCompanyRequest Request) : IRequest<ServiceResult<CompanyDetailsResponse>>;
