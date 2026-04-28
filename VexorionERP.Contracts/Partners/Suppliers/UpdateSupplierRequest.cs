using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateSupplierRequest : CreateSupplierRequest, IUpdateInput<Supplier>
{
    public bool IsActive { get; set; } = true;
}
