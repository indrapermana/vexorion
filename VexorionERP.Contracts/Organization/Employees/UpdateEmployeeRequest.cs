namespace VexorionERP.Contracts;

public class UpdateEmployeeRequest : CreateEmployeeRequest
{
    public bool IsActive { get; set; } = true;
}
