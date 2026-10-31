using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ShiftSessionConfiguration : TenantEntityConfiguration<ShiftSession>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ShiftSession> builder)
    {
        builder.Property(x => x.CashierName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.OpeningFloat).HasPrecision(18, 2);
        builder.Property(x => x.CountedCash).HasPrecision(18, 2);
        builder.Property(x => x.CashSales).HasPrecision(18, 2);
        builder.Property(x => x.CashRefunds).HasPrecision(18, 2);
        builder.Property(x => x.CardSales).HasPrecision(18, 2);
        builder.Property(x => x.TransferSales).HasPrecision(18, 2);
        builder.Property(x => x.CashIn).HasPrecision(18, 2);
        builder.Property(x => x.CashOut).HasPrecision(18, 2);
        builder.Property(x => x.ExpectedCash).HasPrecision(18, 2);
        builder.Property(x => x.CashVariance).HasPrecision(18, 2);
        builder.Property(x => x.VarianceReason).HasMaxLength(1000);
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.CashierId, x.Status });
        builder.HasIndex(x => new { x.TenantId, x.OpenedAtUtc });
    }
}
