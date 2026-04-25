using VexorionERP.Models.Common;

namespace VexorionERP.Models.Organization;

public class Company : TenantEntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? TaxNumber { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }

    public ICollection<Department> Departments { get; set; } = [];
    public ICollection<Employee> Employees { get; set; } = [];
}