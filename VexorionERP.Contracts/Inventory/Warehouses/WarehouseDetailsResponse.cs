using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class WarehouseDetailsResponse : IEntityResponse<Warehouse>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LocationDescription { get; set; }
    public bool IsActive { get; set; }
}
