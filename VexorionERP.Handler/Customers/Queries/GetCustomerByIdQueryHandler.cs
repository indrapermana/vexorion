using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetCustomerByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetCustomerByIdQuery, Customer, CustomerDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetCustomerByIdQuery request) => request.CustomerId;
}
