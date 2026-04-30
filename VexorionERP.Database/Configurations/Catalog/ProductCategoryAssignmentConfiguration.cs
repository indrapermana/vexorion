using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProductCategoryAssignmentConfiguration : TenantEntityConfiguration<ProductCategoryAssignment>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ProductCategoryAssignment> builder)
    {
        builder.HasIndex(x => new { x.TenantId, x.ProductId });
        builder.HasIndex(x => new { x.TenantId, x.ProductCategoryId });
        builder.HasIndex(x => new { x.TenantId, x.ProductId, x.ProductCategoryId }).IsUnique();

        builder.HasOne(x => x.Product)
            .WithMany(x => x.ProductCategoryAssignments)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ProductCategory)
            .WithMany(x => x.ProductCategoryAssignments)
            .HasForeignKey(x => x.ProductCategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
