using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class InventoryBalanceDetailsResponse : IEntityResponse<InventoryBalance>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
    public decimal QuantityAvailable { get; set; }
    public bool IsActive { get; set; }
}
