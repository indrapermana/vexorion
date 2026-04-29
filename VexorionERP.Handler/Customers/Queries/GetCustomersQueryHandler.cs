using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetCustomersQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetCustomersQuery, Customer, CustomerListItemResponse>(serviceProvider);
