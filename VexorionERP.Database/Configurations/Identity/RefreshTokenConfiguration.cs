using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Identity;

namespace VexorionERP.Database.Configurations.Identity;

public class RefreshTokenConfiguration : TenantEntityConfiguration<RefreshToken>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ExpiresAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.RevokedAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.ReplacedByTokenHash).HasMaxLength(128);
        builder.Property(x => x.CreatedByIpAddress).HasMaxLength(64);
        builder.Property(x => x.RevokedByIpAddress).HasMaxLength(64);
        builder.Property(x => x.UserAgent).HasMaxLength(512);
        builder.Ignore(x => x.IsUsable);

        builder.HasIndex(x => new { x.TenantId, x.TokenHash }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.UserId });

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}