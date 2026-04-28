using VexorionERP.Models;

namespace VexorionERP.Models;

public class Department : TenantEntityBase
{
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid? ManagerId { get; set; }

    public Company? Company { get; set; }
    public Employee? Manager { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
}
