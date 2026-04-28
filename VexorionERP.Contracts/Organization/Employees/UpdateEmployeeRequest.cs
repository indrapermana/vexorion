using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateEmployeeRequest : CreateEmployeeRequest, IUpdateInput<Employee>
{
    public bool IsActive { get; set; } = true;
}
