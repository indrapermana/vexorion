using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ConsultantConfiguration : TenantEntityConfiguration<Consultant>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Consultant> builder)
    {
        builder.Property(x => x.ConsultantNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.PhoneNumber).HasMaxLength(50);
        builder.Property(x => x.OrganizationName).HasMaxLength(250);
        builder.Property(x => x.Specialty).HasMaxLength(250);

        builder.HasIndex(x => new { x.TenantId, x.ConsultantNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.Email });
    }
}