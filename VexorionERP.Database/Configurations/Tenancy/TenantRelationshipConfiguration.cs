using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class TenantRelationshipConfiguration : TenantEntityConfiguration<TenantRelationship>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<TenantRelationship> builder)
    {
        builder.Property(x => x.EffectiveFrom).HasColumnType("date");
        builder.Property(x => x.EffectiveTo).HasColumnType("date");
        builder.Property(x => x.ContractReference).HasMaxLength(150);
        builder.Property(x => x.ScopeJson).HasMaxLength(8000);

        builder.HasIndex(x => new { x.TenantId, x.RelatedTenantId, x.RelationshipType }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.Status });

        builder.HasOne(x => x.RelatedTenant)
            .WithMany()
            .HasForeignKey(x => x.RelatedTenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}