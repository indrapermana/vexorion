using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class PosRefundRecordConfiguration : TenantEntityConfiguration<PosRefundRecord>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PosRefundRecord> builder)
    {
        builder.Property(x => x.RequestHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.TotalCreditAmount).HasPrecision(18, 2);
        builder.Property(x => x.RefundAmount).HasPrecision(18, 2);
        builder.Property(x => x.AppliedCreditAmount).HasPrecision(18, 2);
        builder.Property(x => x.PaymentMethod).HasMaxLength(50);
        builder.Property(x => x.ResponseJson).IsRequired();

        builder.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.SalesInvoiceId });
        builder.HasIndex(x => new { x.TenantId, x.ShiftId });

        builder.HasMany(x => x.Lines)
            .WithOne(x => x.Refund)
            .HasForeignKey(x => x.PosRefundRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<SalesInvoice>()
            .WithMany()
            .HasForeignKey(x => x.SalesInvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<SalesInvoice>()
            .WithMany()
            .HasForeignKey(x => x.CreditNoteId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ShiftSession>()
            .WithMany()
            .HasForeignKey(x => x.ShiftId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CustomerPayment>()
            .WithMany()
            .HasForeignKey(x => x.RefundPaymentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}