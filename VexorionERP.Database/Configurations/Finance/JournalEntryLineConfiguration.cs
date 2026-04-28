using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class JournalEntryLineConfiguration : TenantEntityConfiguration<JournalEntryLine>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<JournalEntryLine> builder)
    {
        builder.Property(x => x.LineNumber).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.DebitAmount).HasPrecision(18, 2);
        builder.Property(x => x.CreditAmount).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.TenantId, x.JournalEntryId, x.LineNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.AccountId });

        builder.HasOne(x => x.JournalEntry)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Account)
            .WithMany(x => x.JournalEntryLines)
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
