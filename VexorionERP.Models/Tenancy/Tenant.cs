using VexorionERP.Models;

namespace VexorionERP.Models;

public class Tenant : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Domain { get; set; }

    public ICollection<Company> Companies { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
}
