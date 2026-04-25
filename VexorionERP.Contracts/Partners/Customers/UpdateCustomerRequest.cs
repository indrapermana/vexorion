namespace VexorionERP.Contracts.Partners.Customers;

public class UpdateCustomerRequest : CreateCustomerRequest
{
    public bool IsActive { get; set; } = true;
}