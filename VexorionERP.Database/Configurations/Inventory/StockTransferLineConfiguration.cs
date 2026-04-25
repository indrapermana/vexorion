using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Database.Configurations.Inventory;

public class StockTransferLineConfiguration : TenantEntityConfiguration<StockTransferLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<StockTransferLine> builder)
    {
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 2);

        builder.HasOne(x => x.StockTransfer)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.StockTransferId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.StockTransferLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}