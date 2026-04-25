using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Roles;

public class AssignUserRolesRequest
{
    [Required]
    public IReadOnlyCollection<string> Roles { get; set; } = [];
}