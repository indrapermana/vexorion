using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class StorageUsageLedgerConfiguration : TenantEntityConfiguration<StorageUsageLedger>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<StorageUsageLedger> builder)
    {
        builder.Property(x => x.OperationType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.OccurredAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.Reference).HasMaxLength(250);

        builder.HasIndex(x => new { x.TenantId, x.OccurredAtUtc });

        builder.HasOne(x => x.Project)
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.ProjectDocument)
            .WithMany()
            .HasForeignKey(x => x.ProjectDocumentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.PerformedByUser)
            .WithMany()
            .HasForeignKey(x => x.PerformedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}