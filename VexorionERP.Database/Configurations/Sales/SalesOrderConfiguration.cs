using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Sales;

namespace VexorionERP.Database.Configurations.Sales;

public class SalesOrderConfiguration : TenantEntityConfiguration<SalesOrder>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<SalesOrder> builder)
    {
        builder.Property(x => x.OrderNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.OrderDate).HasColumnType("date");
        builder.Property(x => x.RequiredDate).HasColumnType("date");
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.TotalAmount).HasPrecision(18, 2);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.OrderNumber }).IsUnique();

        builder.HasOne(x => x.Customer)
            .WithMany(x => x.SalesOrders)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.SalesOrders)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}