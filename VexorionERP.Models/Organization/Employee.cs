using VexorionERP.Models;

namespace VexorionERP.Models;

public class Employee : TenantEntityBase
{
    public Guid CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public DateOnly HireDate { get; set; }

    public Company? Company { get; set; }
    public Department? Department { get; set; }
}
