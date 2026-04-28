using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class DepartmentDetailsResponse : IEntityResponse<Department>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid? ManagerId { get; set; }
    public bool IsActive { get; set; }
}
