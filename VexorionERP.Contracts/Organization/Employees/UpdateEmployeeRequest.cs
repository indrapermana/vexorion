namespace VexorionERP.Contracts.Organization.Employees;

public class UpdateEmployeeRequest : CreateEmployeeRequest
{
    public bool IsActive { get; set; } = true;
}