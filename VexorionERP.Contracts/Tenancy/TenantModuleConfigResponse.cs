namespace VexorionERP.Contracts;

public class TenantModuleConfigResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public bool ProjectManagementEnabled { get; set; }
    public bool DocumentManagementEnabled { get; set; }
    public bool EmployeeManagementEnabled { get; set; }
    public bool SalesEnabled { get; set; }
    public bool PurchasingEnabled { get; set; }
    public bool InventoryEnabled { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
