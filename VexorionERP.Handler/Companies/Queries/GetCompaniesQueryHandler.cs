using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetCompaniesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetCompaniesQuery, Company, CompanyListItemResponse>(serviceProvider);
