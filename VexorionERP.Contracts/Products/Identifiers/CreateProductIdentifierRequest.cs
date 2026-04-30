using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateProductIdentifierRequest : ICreateInput<ProductIdentifier>
{
    [Required]
    public Guid ProductId { get; set; }

    [Required]
    [RegularExpression("^(Barcode|QrCode)$", ErrorMessage = "CodeType must be 'Barcode' or 'QrCode'.")]
    public string CodeType { get; set; } = "Barcode";

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string CodeValue { get; set; } = string.Empty;

    public bool IsPrimary { get; set; }
}
