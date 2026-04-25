using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Auditing;

namespace VexorionERP.Database.Configurations.Auditing;

public class AuditLogConfiguration : TenantEntityConfiguration<AuditLog>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<AuditLog> builder)
    {
        builder.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.EntityName).HasMaxLength(100);
        builder.Property(x => x.EntityId).HasMaxLength(100);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.MetadataJson).HasColumnType("jsonb");
        builder.Property(x => x.IpAddress).HasMaxLength(64);
        builder.Property(x => x.UserAgent).HasMaxLength(512);

        builder.HasIndex(x => new { x.TenantId, x.EventType, x.CreatedAtUtc });
        builder.HasIndex(x => new { x.TenantId, x.ActorUserId });
        builder.HasIndex(x => new { x.TenantId, x.TargetUserId });

        builder.HasOne(x => x.ActorUser)
            .WithMany()
            .HasForeignKey(x => x.ActorUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.TargetUser)
            .WithMany()
            .HasForeignKey(x => x.TargetUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}