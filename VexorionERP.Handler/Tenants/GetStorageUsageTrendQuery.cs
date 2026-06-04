using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetStorageUsageTrendQuery(Guid TenantId, int DaysBack = 30)
    : IRequest<ServiceResult<StorageUsageTrendResponse>>;
