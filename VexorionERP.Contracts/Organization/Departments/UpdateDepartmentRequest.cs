using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateDepartmentRequest : CreateDepartmentRequest, IUpdateInput<Department>
{
    public bool IsActive { get; set; } = true;
}
