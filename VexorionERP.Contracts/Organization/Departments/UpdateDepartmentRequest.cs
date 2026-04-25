namespace VexorionERP.Contracts.Organization.Departments;

public class UpdateDepartmentRequest : CreateDepartmentRequest
{
    public bool IsActive { get; set; } = true;
}