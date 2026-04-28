using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateCompanyRequest : CreateCompanyRequest, IUpdateInput<Company>
{
    public bool IsActive { get; set; } = true;
}
