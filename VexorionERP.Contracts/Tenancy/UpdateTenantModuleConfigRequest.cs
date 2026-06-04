namespace VexorionERP.Contracts;

public class UpdateTenantModuleConfigRequest
{
    public bool ProjectManagementEnabled { get; set; }
    public bool DocumentManagementEnabled { get; set; }
    public bool EmployeeManagementEnabled { get; set; }
    public bool SalesEnabled { get; set; }
    public bool PurchasingEnabled { get; set; }
    public bool InventoryEnabled { get; set; }
}
