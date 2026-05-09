using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProjectDocumentConfiguration : TenantEntityConfiguration<ProjectDocument>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ProjectDocument> builder)
    {
        builder.Property(x => x.DocumentNumber).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(300).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(300).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(150).IsRequired();
        builder.Property(x => x.StoragePath).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Tags).HasMaxLength(1000);
        builder.Property(x => x.Notes).HasMaxLength(2000);

        builder.HasIndex(x => new { x.TenantId, x.DocumentNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.ProjectId, x.Status });

        builder.HasOne(x => x.Project)
            .WithMany(x => x.Documents)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Folder)
            .WithMany(x => x.Documents)
            .HasForeignKey(x => x.DocumentFolderId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}