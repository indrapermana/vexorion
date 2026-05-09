using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class DocumentAccessPolicyConfiguration : TenantEntityConfiguration<DocumentAccessPolicy>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<DocumentAccessPolicy> builder)
    {
        builder.Property(x => x.ValidFromUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.ValidToUtc).HasColumnType("timestamp with time zone");

        builder.HasIndex(x => new { x.TenantId, x.ProjectDocumentId, x.SubjectTenantId }).IsUnique();

        builder.HasOne(x => x.ProjectDocument)
            .WithMany(x => x.AccessPolicies)
            .HasForeignKey(x => x.ProjectDocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.SubjectTenant)
            .WithMany()
            .HasForeignKey(x => x.SubjectTenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}