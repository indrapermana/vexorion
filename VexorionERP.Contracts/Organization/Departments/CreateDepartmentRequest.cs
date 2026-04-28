using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateDepartmentRequest : ICreateInput<Department>
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
