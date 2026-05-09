using VexorionERP.Models;

namespace VexorionERP.Models;

public class TenantModuleConfig : TenantEntityBase
{
    public bool ProjectManagementEnabled { get; set; }
    public bool DocumentManagementEnabled { get; set; }
    public bool EmployeeManagementEnabled { get; set; }
    public bool SalesEnabled { get; set; } = true;
    public bool PurchasingEnabled { get; set; } = true;
    public bool InventoryEnabled { get; set; } = true;
    public Guid? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}