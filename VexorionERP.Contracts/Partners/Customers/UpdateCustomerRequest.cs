using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateCustomerRequest : CreateCustomerRequest, IUpdateInput<Customer>
{
    public bool IsActive { get; set; } = true;
}
