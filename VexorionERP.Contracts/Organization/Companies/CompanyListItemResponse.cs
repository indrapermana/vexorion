using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CompanyListItemResponse : IEntityListResponse<Company>
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public bool IsActive { get; set; }
}
