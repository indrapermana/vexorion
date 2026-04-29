using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateAccountRequest : IUpdateInput<Account>
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public AccountType AccountType { get; set; } = AccountType.Asset;
    public NormalBalanceType NormalBalance { get; set; } = NormalBalanceType.Debit;
    public bool IsPostingAllowed { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}
