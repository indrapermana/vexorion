using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class FiscalPeriodConfiguration : TenantEntityConfiguration<FiscalPeriod>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<FiscalPeriod> builder)
    {
        builder.Property(x => x.PeriodCode).HasMaxLength(30).IsRequired();
        builder.Property(x => x.StartDate).HasColumnType("date");
        builder.Property(x => x.EndDate).HasColumnType("date");
        builder.Property(x => x.IsClosed).HasDefaultValue(false);
        builder.Property(x => x.ClosedAtUtc).HasColumnType("timestamp with time zone");

        builder.HasIndex(x => new { x.TenantId, x.PeriodCode }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.StartDate, x.EndDate });
    }
}
