using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class PurchaseReceiptLineConfiguration : TenantEntityConfiguration<PurchaseReceiptLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PurchaseReceiptLine> builder)
    {
        builder.Property(x => x.ReceivedQuantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.TenantId, x.PurchaseReceiptId });
        builder.HasIndex(x => new { x.TenantId, x.PurchaseOrderLineId });

        builder.HasOne(x => x.PurchaseReceipt)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.PurchaseReceiptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.PurchaseOrderLine)
            .WithMany(x => x.ReceiptLines)
            .HasForeignKey(x => x.PurchaseOrderLineId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
