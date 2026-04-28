using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProductConfiguration : TenantEntityConfiguration<Product>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Product> builder)
    {
        builder.Property(x => x.Sku).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.UnitOfMeasure).HasMaxLength(20).IsRequired();
        builder.Property(x => x.StandardCost).HasPrecision(18, 2);
        builder.Property(x => x.SalesPrice).HasPrecision(18, 2);
        builder.Property(x => x.ReorderLevel).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.TenantId, x.Sku }).IsUnique();
    }
}
