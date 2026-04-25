namespace VexorionERP.Contracts.Organization.Companies;

public class UpdateCompanyRequest : CreateCompanyRequest
{
    public bool IsActive { get; set; } = true;
}