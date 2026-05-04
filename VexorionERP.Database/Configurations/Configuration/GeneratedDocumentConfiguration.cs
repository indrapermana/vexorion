using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class GeneratedDocumentConfiguration : TenantEntityConfiguration<GeneratedDocument>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<GeneratedDocument> builder)
    {
        builder.Property(x => x.SourceType).HasConversion<int>().IsRequired();
        builder.Property(x => x.Format).HasConversion<int>().IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(260).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(120).IsRequired();
        builder.Property(x => x.BlobPath).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.ChecksumSha256).HasMaxLength(64).IsRequired();
        builder.Property(x => x.GeneratedAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.ErrorMessage).HasMaxLength(2000);

        builder.HasIndex(x => new { x.TenantId, x.SourceType, x.SourceEntityId });
        builder.HasIndex(x => new { x.TenantId, x.Status, x.GeneratedAtUtc });
        builder.HasIndex(x => new { x.TenantId, x.SourceType, x.SourceEntityId, x.Format, x.Version }).IsUnique();
    }
}