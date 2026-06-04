using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetStorageTopConsumersQuery(Guid TenantId, int Take = 10)
    : IRequest<ServiceResult<StorageTopConsumersResponse>>;