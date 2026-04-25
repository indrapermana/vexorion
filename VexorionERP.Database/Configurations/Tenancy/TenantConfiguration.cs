using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Tenancy;

namespace VexorionERP.Database.Configurations.Tenancy;

public class TenantConfiguration : BaseConfiguration<Tenant>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Tenant> builder)
    {
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Domain).HasMaxLength(200);

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Domain).IsUnique();
    }
}