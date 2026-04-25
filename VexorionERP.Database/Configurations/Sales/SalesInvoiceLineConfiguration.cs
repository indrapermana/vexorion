using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Sales;

namespace VexorionERP.Database.Configurations.Sales;

public class SalesInvoiceLineConfiguration : TenantEntityConfiguration<SalesInvoiceLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<SalesInvoiceLine> builder)
    {
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);
        builder.Property(x => x.TaxAmount).HasPrecision(18, 2);
        builder.Ignore(x => x.LineSubtotal);
        builder.Ignore(x => x.LineTotal);

        builder.HasIndex(x => new { x.SalesInvoiceId, x.ProductId });

        builder.HasOne(x => x.SalesInvoice)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.SalesInvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(x => x.SalesInvoiceLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TaxCode)
            .WithMany()
            .HasForeignKey(x => x.TaxCodeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}