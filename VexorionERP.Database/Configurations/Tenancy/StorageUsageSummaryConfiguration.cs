using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class StorageUsageSummaryConfiguration : TenantEntityConfiguration<StorageUsageSummary>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<StorageUsageSummary> builder)
    {
        builder.Property(x => x.LastCalculatedAtUtc).HasColumnType("timestamp with time zone");

        builder.HasIndex(x => x.TenantId).IsUnique();
    }
}