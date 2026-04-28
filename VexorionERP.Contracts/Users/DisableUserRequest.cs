using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class DisableUserRequest
{
    [Required]
    public bool IsActive { get; set; }
}
