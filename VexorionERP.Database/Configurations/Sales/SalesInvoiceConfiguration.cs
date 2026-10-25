using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class SalesInvoiceConfiguration : TenantEntityConfiguration<SalesInvoice>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<SalesInvoice> builder)
    {
        builder.Property(x => x.InvoiceNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.InvoiceDate).HasColumnType("date");
        builder.Property(x => x.DueDate).HasColumnType("date");
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Subtotal).HasPrecision(18, 2);
        builder.Property(x => x.TaxTotal).HasPrecision(18, 2);
        builder.Property(x => x.GrandTotal).HasPrecision(18, 2);
        builder.Property(x => x.PaidTotal).HasPrecision(18, 2);
        builder.Property(x => x.AppliedCreditTotal).HasPrecision(18, 2);
        builder.Property(x => x.Version).IsRowVersion();
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Ignore(x => x.BalanceDue);

        builder.HasIndex(x => new { x.TenantId, x.InvoiceNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.CustomerId, x.InvoiceDate });

        builder.HasOne(x => x.Customer)
            .WithMany(x => x.SalesInvoices)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SourceSalesOrder)
            .WithMany()
            .HasForeignKey(x => x.SourceSalesOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PaymentTerm)
            .WithMany()
            .HasForeignKey(x => x.PaymentTermId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<SalesInvoice>()
            .WithMany()
            .HasForeignKey(x => x.CreditNoteOfInvoiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
