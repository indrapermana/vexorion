using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateProductRequest: CreateProductRequest, IUpdateInput<Product>
{
    public bool IsActive { get; set; } = true;
}
