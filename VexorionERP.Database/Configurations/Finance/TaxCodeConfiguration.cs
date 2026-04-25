using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Finance;

namespace VexorionERP.Database.Configurations.Finance;

public class TaxCodeConfiguration : TenantEntityConfiguration<TaxCode>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<TaxCode> builder)
    {
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.RatePercent).HasPrecision(9, 4);
        builder.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
    }
}