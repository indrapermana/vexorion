using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateCompanyCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateCompanyCommand, Company, CreateCompanyRequest, CompanyDetailsResponse>(serviceProvider)
{
    protected override CreateCompanyRequest GetCreateRequest(CreateCompanyCommand request) => request.Request;
}
