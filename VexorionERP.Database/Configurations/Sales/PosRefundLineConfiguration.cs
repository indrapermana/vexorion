using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class PosRefundLineConfiguration : TenantEntityConfiguration<PosRefundLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PosRefundLine> builder)
    {
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.TenantId, x.PosRefundRecordId, x.SalesInvoiceLineId }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.SalesInvoiceLineId });

        builder.HasOne(x => x.SalesInvoiceLine)
            .WithMany()
            .HasForeignKey(x => x.SalesInvoiceLineId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}