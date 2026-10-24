using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class InventoryMovementConfiguration : TenantEntityConfiguration<InventoryMovement>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<InventoryMovement> builder)
    {
        builder.Property(x => x.ReferenceNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.QuantityOnHandDelta).HasPrecision(18, 2);
        builder.Property(x => x.QuantityReservedDelta).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.TenantId, x.ProductId, x.WarehouseId, x.CreatedAtUtc });

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.InventoryMovements)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<PosRefundRecord>()
            .WithMany()
            .HasForeignKey(x => x.PosRefundRecordId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
