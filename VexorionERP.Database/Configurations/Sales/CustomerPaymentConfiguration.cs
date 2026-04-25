using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Sales;

namespace VexorionERP.Database.Configurations.Sales;

public class CustomerPaymentConfiguration : TenantEntityConfiguration<CustomerPayment>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<CustomerPayment> builder)
    {
        builder.Property(x => x.PaymentDate).HasColumnType("date");
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.ReferenceNumber).HasMaxLength(50);
        builder.Property(x => x.PaymentMethod).HasMaxLength(50);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.CustomerId, x.PaymentDate });
        builder.HasIndex(x => new { x.TenantId, x.SalesInvoiceId, x.PaymentDate });

        builder.HasOne(x => x.Customer)
            .WithMany(x => x.CustomerPayments)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SalesInvoice)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.SalesInvoiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}