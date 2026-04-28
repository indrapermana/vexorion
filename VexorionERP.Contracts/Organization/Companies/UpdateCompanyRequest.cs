namespace VexorionERP.Contracts;

public class UpdateCompanyRequest : CreateCompanyRequest
{
    public bool IsActive { get; set; } = true;
}
