namespace VexorionERP.Contracts.Partners.Suppliers;

public class UpdateSupplierRequest : CreateSupplierRequest
{
    public bool IsActive { get; set; } = true;
}