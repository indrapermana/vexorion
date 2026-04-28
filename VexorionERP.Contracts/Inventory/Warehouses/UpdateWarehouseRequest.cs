using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateWarehouseRequest : CreateWarehouseRequest, IUpdateInput<Warehouse>
{
    public bool IsActive { get; set; } = true;
}
