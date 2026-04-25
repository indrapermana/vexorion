using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Purchasing;

namespace VexorionERP.Database.Configurations.Purchasing;

public class PurchaseOrderLineConfiguration : TenantEntityConfiguration<PurchaseOrderLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PurchaseOrderLine> builder)
    {
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 2);
        builder.Property(x => x.ReceivedQuantity).HasPrecision(18, 2);
        builder.Ignore(x => x.RemainingQuantity);
        builder.Ignore(x => x.LineTotal);

        builder.HasOne(x => x.PurchaseOrder)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.PurchaseOrderLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}