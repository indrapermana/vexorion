using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetAccountByIdQuery(Guid AccountId) : IRequest<ServiceResult<AccountDetailsResponse>>;
