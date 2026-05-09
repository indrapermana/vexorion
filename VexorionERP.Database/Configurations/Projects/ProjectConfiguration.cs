using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProjectConfiguration : TenantEntityConfiguration<Project>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Project> builder)
    {
        builder.Property(x => x.ProjectNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(250).IsRequired();
        builder.Property(x => x.GovernmentAgency).HasMaxLength(250);
        builder.Property(x => x.SubmissionReference).HasMaxLength(100);
        builder.Property(x => x.StartDate).HasColumnType("date");
        builder.Property(x => x.EndDate).HasColumnType("date");
        builder.Property(x => x.Notes).HasMaxLength(2000);

        builder.HasIndex(x => new { x.TenantId, x.ProjectNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.Status });

        builder.HasOne(x => x.Category)
            .WithMany(x => x.Projects)
            .HasForeignKey(x => x.ProjectCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}