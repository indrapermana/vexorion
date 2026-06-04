using Mediator;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteTenantRelationshipCommand(Guid RelationshipId) : IRequest<ServiceResult<bool>>;

public sealed class DeleteTenantRelationshipCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteTenantRelationshipCommand, TenantRelationship>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteTenantRelationshipCommand command) => command.RelationshipId;
}
