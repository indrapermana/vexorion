namespace VexorionERP.Contracts;

public class UpdateDepartmentRequest : CreateDepartmentRequest
{
    public bool IsActive { get; set; } = true;
}
