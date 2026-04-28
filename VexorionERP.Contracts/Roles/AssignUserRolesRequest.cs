using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class AssignUserRolesRequest
{
    [Required]
    public IReadOnlyCollection<string> Roles { get; set; } = [];
}
