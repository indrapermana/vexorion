using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class AccountListItemResponse
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public NormalBalanceType NormalBalance { get; set; }
    public bool IsPostingAllowed { get; set; }
    public bool IsActive { get; set; }
}
