using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class StockCountConfiguration : TenantEntityConfiguration<StockCount>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<StockCount> builder)
    {
        builder.Property(x => x.CountNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.CountDate).HasColumnType("date");
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.CountNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.WarehouseId, x.CountDate });

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.StockCounts)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
