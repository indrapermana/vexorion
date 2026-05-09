using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class DocumentVersionConfiguration : TenantEntityConfiguration<DocumentVersion>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<DocumentVersion> builder)
    {
        builder.Property(x => x.FileName).HasMaxLength(300).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(150).IsRequired();
        builder.Property(x => x.StoragePath).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Checksum).HasMaxLength(128);
        builder.Property(x => x.UploadedAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.ProjectDocumentId, x.VersionNumber }).IsUnique();

        builder.HasOne(x => x.ProjectDocument)
            .WithMany(x => x.Versions)
            .HasForeignKey(x => x.ProjectDocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.UploadedByUser)
            .WithMany()
            .HasForeignKey(x => x.UploadedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}