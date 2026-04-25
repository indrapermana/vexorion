using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Sales;

namespace VexorionERP.Database.Configurations.Sales;

public class SalesShipmentLineConfiguration : TenantEntityConfiguration<SalesShipmentLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<SalesShipmentLine> builder)
    {
        builder.Property(x => x.ShippedQuantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.TenantId, x.SalesShipmentId });
        builder.HasIndex(x => new { x.TenantId, x.SalesOrderLineId });

        builder.HasOne(x => x.SalesShipment)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.SalesShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.SalesOrderLine)
            .WithMany(x => x.ShipmentLines)
            .HasForeignKey(x => x.SalesOrderLineId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
