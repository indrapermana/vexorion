using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class TenantPreferenceConfiguration : TenantEntityConfiguration<TenantPreference>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<TenantPreference> builder)
    {
        builder.Property(x => x.MenuHiddenLinksJson)
            .HasColumnType("jsonb")
            .HasDefaultValue("[]")
            .IsRequired();

        builder.Property(x => x.DefaultDiscountPercent).HasPrecision(9, 4);
        builder.Property(x => x.MaxManualDiscountPercent).HasPrecision(9, 4);
        builder.Property(x => x.AllowNegativeDiscount).HasDefaultValue(false);

        builder.HasIndex(x => x.TenantId).IsUnique();
    }
}
