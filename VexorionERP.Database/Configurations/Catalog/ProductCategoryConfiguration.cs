using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProductCategoryConfiguration : TenantEntityConfiguration<ProductCategory>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ProductCategory> builder)
    {
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.NormalizedName).HasMaxLength(120).IsRequired();

        builder.HasIndex(x => new { x.TenantId, x.NormalizedName }).IsUnique();

        builder.HasMany(x => x.ProductCategoryAssignments)
            .WithOne(x => x.ProductCategory)
            .HasForeignKey(x => x.ProductCategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
