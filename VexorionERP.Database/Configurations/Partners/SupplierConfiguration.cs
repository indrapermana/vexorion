using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Partners;

namespace VexorionERP.Database.Configurations.Partners;

public class SupplierConfiguration : TenantEntityConfiguration<Supplier>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Supplier> builder)
    {
        builder.Property(x => x.SupplierNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ContactName).HasMaxLength(150);
        builder.Property(x => x.Email).HasMaxLength(256);
        builder.Property(x => x.PhoneNumber).HasMaxLength(50);
        builder.Property(x => x.Address).HasMaxLength(300);
        builder.Property(x => x.PaymentTerms).HasMaxLength(100);

        builder.HasIndex(x => new { x.TenantId, x.SupplierNumber }).IsUnique();
    }
}