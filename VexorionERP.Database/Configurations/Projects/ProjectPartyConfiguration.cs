using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProjectPartyConfiguration : TenantEntityConfiguration<ProjectParty>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ProjectParty> builder)
    {
        builder.Property(x => x.EffectiveFrom).HasColumnType("date");
        builder.Property(x => x.EffectiveTo).HasColumnType("date");

        builder.HasIndex(x => new { x.TenantId, x.ProjectId, x.RelatedTenantId, x.RelationshipType }).IsUnique();

        builder.HasOne(x => x.Project)
            .WithMany(x => x.Parties)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.RelatedTenant)
            .WithMany()
            .HasForeignKey(x => x.RelatedTenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}