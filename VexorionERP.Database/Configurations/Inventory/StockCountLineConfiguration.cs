using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class StockCountLineConfiguration : TenantEntityConfiguration<StockCountLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<StockCountLine> builder)
    {
        builder.Property(x => x.SystemQuantity).HasPrecision(18, 2);
        builder.Property(x => x.CountedQuantity).HasPrecision(18, 2);
        builder.Ignore(x => x.VarianceQuantity);

        builder.HasOne(x => x.StockCount)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.StockCountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.StockCountLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
