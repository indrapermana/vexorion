using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetCompanyByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetCompanyByIdQuery, Company, CompanyDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetCompanyByIdQuery request) => request.CompanyId;
}
