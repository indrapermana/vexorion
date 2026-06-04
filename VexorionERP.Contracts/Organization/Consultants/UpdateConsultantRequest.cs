using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateConsultantRequest : CreateConsultantRequest, IUpdateInput<Consultant>
{
    public bool IsActive { get; set; } = true;
}
