using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateCompanyCommand(CreateCompanyRequest Request) : IRequest<ServiceResult<CompanyDetailsResponse>>;
