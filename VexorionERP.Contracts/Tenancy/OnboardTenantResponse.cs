namespace VexorionERP.Contracts;

public class OnboardTenantResponse
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid AdminUserId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string AdminUserName { get; set; } = string.Empty;
}
