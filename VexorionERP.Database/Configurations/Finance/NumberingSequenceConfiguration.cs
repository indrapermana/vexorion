using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class NumberingSequenceConfiguration : TenantEntityConfiguration<NumberingSequence>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<NumberingSequence> builder)
    {
        builder.Property(x => x.DocumentType).HasMaxLength(60).IsRequired();
        builder.Property(x => x.PrefixTemplate).HasMaxLength(60).IsRequired();
        builder.Property(x => x.NextNumber).IsRequired();
        builder.Property(x => x.NumberPadding).IsRequired();
        builder.Property(x => x.CurrentPeriodKey).HasMaxLength(20);

        builder.HasIndex(x => new { x.TenantId, x.DocumentType }).IsUnique();
    }
}
