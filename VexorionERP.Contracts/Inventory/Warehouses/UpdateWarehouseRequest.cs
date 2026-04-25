namespace VexorionERP.Contracts.Inventory.Warehouses;

public class UpdateWarehouseRequest : CreateWarehouseRequest
{
    public bool IsActive { get; set; } = true;
}