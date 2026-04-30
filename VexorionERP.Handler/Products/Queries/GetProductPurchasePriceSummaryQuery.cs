using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProductPurchasePriceSummaryQuery(
    Guid ProductId,
    DateOnly? FromDate,
    DateOnly? ToDate)
    : IRequest<ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>>;
