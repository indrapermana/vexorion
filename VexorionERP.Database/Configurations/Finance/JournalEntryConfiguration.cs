using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class JournalEntryConfiguration : TenantEntityConfiguration<JournalEntry>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<JournalEntry> builder)
    {
        builder.Property(x => x.JournalNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.SourceDocumentType).HasMaxLength(60).IsRequired();
        builder.Property(x => x.PostingDate).HasColumnType("date");
        builder.Property(x => x.TotalDebit).HasPrecision(18, 2);
        builder.Property(x => x.TotalCredit).HasPrecision(18, 2);
        builder.Property(x => x.Description).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.JournalNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.PostingDate });
        builder.HasIndex(x => new { x.TenantId, x.SourceDocumentType, x.SourceDocumentId });

        builder.HasOne(x => x.FiscalPeriod)
            .WithMany(x => x.JournalEntries)
            .HasForeignKey(x => x.FiscalPeriodId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReversedJournalEntry)
            .WithMany(x => x.ReversalEntries)
            .HasForeignKey(x => x.ReversedJournalEntryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
