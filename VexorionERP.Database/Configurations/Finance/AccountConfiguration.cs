using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Finance;

namespace VexorionERP.Database.Configurations.Finance;

public class AccountConfiguration : TenantEntityConfiguration<Account>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Account> builder)
    {
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.IsPostingAllowed).HasDefaultValue(true);

        builder.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.AccountType });
    }
}