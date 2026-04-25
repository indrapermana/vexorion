using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Partners;

namespace VexorionERP.Database.Configurations.Partners;

public class CustomerConfiguration : TenantEntityConfiguration<Customer>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Customer> builder)
    {
        builder.Property(x => x.CustomerNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ContactName).HasMaxLength(150);
        builder.Property(x => x.Email).HasMaxLength(256);
        builder.Property(x => x.PhoneNumber).HasMaxLength(50);
        builder.Property(x => x.BillingAddress).HasMaxLength(300);
        builder.Property(x => x.ShippingAddress).HasMaxLength(300);
        builder.Property(x => x.CreditLimit).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.TenantId, x.CustomerNumber }).IsUnique();
    }
}