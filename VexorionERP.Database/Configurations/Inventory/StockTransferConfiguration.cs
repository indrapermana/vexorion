using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Database.Configurations.Inventory;

public class StockTransferConfiguration : TenantEntityConfiguration<StockTransfer>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<StockTransfer> builder)
    {
        builder.Property(x => x.TransferNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.TransferDate).HasColumnType("date");
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.TransferNumber }).IsUnique();

        builder.HasOne(x => x.SourceWarehouse)
            .WithMany(x => x.SourceStockTransfers)
            .HasForeignKey(x => x.SourceWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DestinationWarehouse)
            .WithMany(x => x.DestinationStockTransfers)
            .HasForeignKey(x => x.DestinationWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}