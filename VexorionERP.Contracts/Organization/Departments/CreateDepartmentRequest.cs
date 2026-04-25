using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Organization.Departments;

public class CreateDepartmentRequest
{
    public Guid CompanyId { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Code { get; set; } = string.Empty;
    public Guid? ManagerId { get; set; }
}