namespace VexorionERP.Contracts;

public class ProductImageUploadResponse
{
    public Guid ProductId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
}
