using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectListFilterRequest
{
    public ProjectLifecycleStatus? Status { get; set; }
    public Guid? RelatedTenantId { get; set; }
}