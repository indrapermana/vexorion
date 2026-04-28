using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class InventoryBalanceConfiguration : TenantEntityConfiguration<InventoryBalance>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<InventoryBalance> builder)
    {
        builder.Property(x => x.QuantityOnHand).HasPrecision(18, 2);
        builder.Property(x => x.QuantityReserved).HasPrecision(18, 2);
        builder.Ignore(x => x.QuantityAvailable);

        builder.HasIndex(x => new { x.TenantId, x.ProductId, x.WarehouseId }).IsUnique();

        builder.HasOne(x => x.Product)
            .WithMany(x => x.InventoryBalances)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.InventoryBalances)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
