using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Sales;

namespace VexorionERP.Database.Configurations.Sales;

public class SalesShipmentConfiguration : TenantEntityConfiguration<SalesShipment>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<SalesShipment> builder)
    {
        builder.Property(x => x.ShipmentNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.ShipmentDate).HasColumnType("date");
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.ShipmentNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.SalesOrderId, x.ShipmentDate });

        builder.HasOne(x => x.SalesOrder)
            .WithMany(x => x.Shipments)
            .HasForeignKey(x => x.SalesOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
