using VexorionERP.Models.Common;

namespace VexorionERP.Models.Identity;

public class RefreshToken : TenantEntityBase
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? CreatedByIpAddress { get; set; }
    public string? RevokedByIpAddress { get; set; }
    public string? UserAgent { get; set; }

    public bool IsUsable => RevokedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;
    public User? User { get; set; }
}