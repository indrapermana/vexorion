using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class SalesOrderLineConfiguration : TenantEntityConfiguration<SalesOrderLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<SalesOrderLine> builder)
    {
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);
        builder.Property(x => x.ShippedQuantity).HasPrecision(18, 2);
        builder.Ignore(x => x.RemainingQuantity);
        builder.Ignore(x => x.LineTotal);

        builder.HasOne(x => x.SalesOrder)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.SalesOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.SalesOrderLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
