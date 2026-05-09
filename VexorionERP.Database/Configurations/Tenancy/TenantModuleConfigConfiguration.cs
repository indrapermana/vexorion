using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class TenantModuleConfigConfiguration : TenantEntityConfiguration<TenantModuleConfig>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<TenantModuleConfig> builder)
    {
        builder.HasIndex(x => x.TenantId).IsUnique();

        builder.HasOne(x => x.UpdatedByUser)
            .WithMany()
            .HasForeignKey(x => x.UpdatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}