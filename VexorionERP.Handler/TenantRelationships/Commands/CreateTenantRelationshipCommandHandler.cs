using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateTenantRelationshipCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateTenantRelationshipCommand, TenantRelationship, CreateTenantRelationshipRequest, TenantRelationshipDetailsResponse>(serviceProvider)
{
    protected override CreateTenantRelationshipRequest GetCreateRequest(CreateTenantRelationshipCommand command) => command.Request;
}
