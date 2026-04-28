namespace VexorionERP.Contracts;

public class UpdateWarehouseRequest : CreateWarehouseRequest
{
    public bool IsActive { get; set; } = true;
}
