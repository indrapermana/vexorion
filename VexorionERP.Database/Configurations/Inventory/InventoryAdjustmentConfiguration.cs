using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Database.Configurations.Inventory;

public class InventoryAdjustmentConfiguration : TenantEntityConfiguration<InventoryAdjustment>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<InventoryAdjustment> builder)
    {
        builder.Property(x => x.AdjustmentNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.AdjustmentDate).HasColumnType("date");
        builder.Property(x => x.Reason).HasMaxLength(250).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.AdjustmentNumber }).IsUnique();

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.InventoryAdjustments)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}