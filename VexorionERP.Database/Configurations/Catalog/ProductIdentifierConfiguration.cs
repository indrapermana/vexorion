using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProductIdentifierConfiguration : TenantEntityConfiguration<ProductIdentifier>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ProductIdentifier> builder)
    {
        builder.ToTable(table => table.HasCheckConstraint(
            "CK_ProductIdentifier_CodeType",
            "\"CodeType\" IN ('Barcode','QrCode')"));

        builder.Property(x => x.CodeType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.CodeValue).HasMaxLength(200).IsRequired();
        builder.Property(x => x.NormalizedCodeValue).HasMaxLength(200).IsRequired();
        builder.Property(x => x.IsPrimary).IsRequired().HasDefaultValue(false);

        builder.HasIndex(x => new { x.TenantId, x.NormalizedCodeValue }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.ProductId });
        builder.HasIndex(x => new { x.TenantId, x.ProductId, x.CodeType, x.IsPrimary })
            .HasFilter("\"IsPrimary\" = TRUE");

        builder.HasOne(x => x.Product)
            .WithMany(x => x.ProductIdentifiers)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
