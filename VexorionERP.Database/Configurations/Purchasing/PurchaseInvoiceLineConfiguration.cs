using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Purchasing;

namespace VexorionERP.Database.Configurations.Purchasing;

public class PurchaseInvoiceLineConfiguration : TenantEntityConfiguration<PurchaseInvoiceLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PurchaseInvoiceLine> builder)
    {
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);
        builder.Property(x => x.TaxAmount).HasPrecision(18, 2);
        builder.Ignore(x => x.LineSubtotal);
        builder.Ignore(x => x.LineTotal);

        builder.HasIndex(x => new { x.PurchaseInvoiceId, x.ProductId });

        builder.HasOne(x => x.PurchaseInvoice)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.PurchaseInvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.PurchaseInvoiceLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TaxCode)
            .WithMany()
            .HasForeignKey(x => x.TaxCodeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}