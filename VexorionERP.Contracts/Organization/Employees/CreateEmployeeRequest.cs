using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateEmployeeRequest : ICreateInput<Employee>
{
    public Guid CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string EmployeeNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [StringLength(50)]
    public string? PhoneNumber { get; set; }

    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string JobTitle { get; set; } = string.Empty;
    public DateOnly HireDate { get; set; }
}
