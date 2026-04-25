using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Finance;

namespace VexorionERP.Database.Configurations.Finance;

public class PaymentTermConfiguration : TenantEntityConfiguration<PaymentTerm>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PaymentTerm> builder)
    {
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
    }
}