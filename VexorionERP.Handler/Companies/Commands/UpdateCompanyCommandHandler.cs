using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateCompanyCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateCompanyCommand, Company, UpdateCompanyRequest, CompanyDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateCompanyCommand request) => request.CompanyId;

    protected override UpdateCompanyRequest GetUpdateRequest(UpdateCompanyCommand request) => request.Request;
}
