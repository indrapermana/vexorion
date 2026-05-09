using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class DocumentFolderConfiguration : TenantEntityConfiguration<DocumentFolder>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<DocumentFolder> builder)
    {
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.ProjectId, x.ParentFolderId, x.Name }).IsUnique();

        builder.HasOne(x => x.Project)
            .WithMany(x => x.Folders)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ParentFolder)
            .WithMany(x => x.Children)
            .HasForeignKey(x => x.ParentFolderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}