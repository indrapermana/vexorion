using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Database.Configurations.Inventory;

public class InventoryAdjustmentLineConfiguration : TenantEntityConfiguration<InventoryAdjustmentLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<InventoryAdjustmentLine> builder)
    {
        builder.Property(x => x.QuantityDelta).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 2);
        builder.Property(x => x.Reason).HasMaxLength(250);

        builder.HasOne(x => x.InventoryAdjustment)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.InventoryAdjustmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.InventoryAdjustmentLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}