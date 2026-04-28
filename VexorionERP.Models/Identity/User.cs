using Microsoft.AspNetCore.Identity;
using VexorionERP.Models;

namespace VexorionERP.Models;

public class User : IdentityUser<Guid>, ITenantEntity
{
    public User()
    {
        Id = Guid.NewGuid();
        SecurityStamp = Guid.NewGuid().ToString("N");
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? LastLoginAtUtc { get; set; }
    public Guid? EmployeeId { get; set; }

    public Employee? Employee { get; set; }
}
