using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class VendorPaymentConfiguration : TenantEntityConfiguration<VendorPayment>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<VendorPayment> builder)
    {
        builder.Property(x => x.PaymentDate).HasColumnType("date");
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.ReferenceNumber).HasMaxLength(50);
        builder.Property(x => x.PaymentMethod).HasMaxLength(50);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.SupplierId, x.PaymentDate });
        builder.HasIndex(x => new { x.TenantId, x.PurchaseInvoiceId, x.PaymentDate });

        builder.HasOne(x => x.Supplier)
            .WithMany(x => x.VendorPayments)
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PurchaseInvoice)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.PurchaseInvoiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
