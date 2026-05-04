using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ImportJobConfiguration : TenantEntityConfiguration<ImportJob>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ImportJob> builder)
    {
        builder.Property(x => x.ImportType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.SourceFileName).HasMaxLength(260).IsRequired();
        builder.Property(x => x.SourceBlobPath).HasMaxLength(1024);
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.ErrorSummary).HasMaxLength(2000);
        builder.Property(x => x.IdempotencyKey).HasMaxLength(128);

        builder.HasIndex(x => new { x.TenantId, x.ImportType, x.CreatedAtUtc });
        builder.HasIndex(x => new { x.TenantId, x.Status, x.CreatedAtUtc });
        builder.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique();
    }
}