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
        builder.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.CashierId, x.Status });
        builder.HasIndex(x => new { x.TenantId, x.OpenedAtUtc });
    }
}
