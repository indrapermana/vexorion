using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteCompanyCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteCompanyCommand, Company>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteCompanyCommand request) => request.CompanyId;
}
