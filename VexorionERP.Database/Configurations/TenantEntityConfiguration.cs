using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public abstract class TenantEntityConfiguration<TEntity> : BaseConfiguration<TEntity>
    where TEntity : TenantEntityBase
{
    protected override void ConfigureEntity(EntityTypeBuilder<TEntity> builder)
    {
        builder.Property(x => x.TenantId).IsRequired();
        builder.HasIndex(x => x.TenantId);
        ConfigureTenantRelationship(builder);

        ConfigureTenantEntity(builder);
    }

    protected virtual void ConfigureTenantRelationship(EntityTypeBuilder<TEntity> builder)
    {
        builder.HasOne(x => x.Tenant)
            .WithMany()
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    protected abstract void ConfigureTenantEntity(EntityTypeBuilder<TEntity> builder);
}
