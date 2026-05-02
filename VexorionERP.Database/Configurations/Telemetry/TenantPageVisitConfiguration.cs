using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class TenantPageVisitConfiguration : TenantEntityConfiguration<TenantPageVisit>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<TenantPageVisit> builder)
    {
        builder.Property(x => x.Path).HasMaxLength(256).IsRequired();
        builder.Property(x => x.VisitDate).HasColumnType("date");
        builder.Property(x => x.VisitCount).HasDefaultValue(0);
        builder.Property(x => x.LastVisitedAtUtc).HasColumnType("timestamp with time zone");

        builder.HasIndex(x => new { x.TenantId, x.Path, x.VisitDate }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.VisitDate });
        builder.HasIndex(x => new { x.TenantId, x.LastVisitedAtUtc });
    }
}
