namespace VexorionERP.Contracts;

public class UpdateCustomerRequest : CreateCustomerRequest
{
    public bool IsActive { get; set; } = true;
}
