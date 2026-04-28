using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class PurchaseReceiptConfiguration : TenantEntityConfiguration<PurchaseReceipt>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PurchaseReceipt> builder)
    {
        builder.Property(x => x.ReceiptNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.ReceiptDate).HasColumnType("date");
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.PurchaseOrderId, x.ReceiptDate });

        builder.HasOne(x => x.PurchaseOrder)
            .WithMany(x => x.Receipts)
            .HasForeignKey(x => x.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
