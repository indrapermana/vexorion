using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateTenantRelationshipCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateTenantRelationshipCommand, TenantRelationship, UpdateTenantRelationshipRequest, TenantRelationshipDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateTenantRelationshipCommand command) => command.RelationshipId;

    protected override UpdateTenantRelationshipRequest GetUpdateRequest(UpdateTenantRelationshipCommand command) => command.Request;
}
