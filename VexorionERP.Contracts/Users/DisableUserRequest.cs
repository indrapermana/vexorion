using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Users;

public class DisableUserRequest
{
    [Required]
    public bool IsActive { get; set; }
}