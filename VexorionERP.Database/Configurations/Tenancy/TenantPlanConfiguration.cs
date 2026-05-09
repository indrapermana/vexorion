using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class TenantPlanConfiguration : TenantEntityConfiguration<TenantPlan>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<TenantPlan> builder)
    {
        builder.Property(x => x.PlanCode).HasMaxLength(50).IsRequired();
        builder.Property(x => x.PlanName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.EffectiveFromUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.EffectiveToUtc).HasColumnType("timestamp with time zone");

        builder.HasIndex(x => new { x.TenantId, x.PlanCode, x.EffectiveFromUtc }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.IsDefault });
    }
}