using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Purchasing;

namespace VexorionERP.Database.Configurations.Purchasing;

public class PurchaseOrderConfiguration : TenantEntityConfiguration<PurchaseOrder>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.Property(x => x.OrderNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.OrderDate).HasColumnType("date");
        builder.Property(x => x.ExpectedReceiptDate).HasColumnType("date");
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.TotalAmount).HasPrecision(18, 2);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.OrderNumber }).IsUnique();

        builder.HasOne(x => x.Supplier)
            .WithMany(x => x.PurchaseOrders)
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
            .WithMany(x => x.PurchaseOrders)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}