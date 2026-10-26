using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInventoryReorderRecommendationsQuery() : IRequest<ServiceResult<InventoryReorderReportResponse>>;