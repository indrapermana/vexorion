using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Identity;

namespace VexorionERP.Database.Configurations.Identity;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable(nameof(User));

        builder.Property(x => x.TenantId).IsRequired();
        builder.Property(x => x.UserName).HasMaxLength(256).IsRequired();
        builder.Property(x => x.NormalizedUserName).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.NormalizedEmail).HasMaxLength(256).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(2000);
        builder.Property(x => x.SecurityStamp).HasMaxLength(100).IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasMaxLength(100).IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(100);
        builder.Property(x => x.LastName).HasMaxLength(100);
        builder.Property(x => x.CreatedAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.UpdatedAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.LockoutEnd).HasColumnType("timestamp with time zone");
        builder.Property(x => x.LastLoginAtUtc).HasColumnType("timestamp with time zone");

        builder.HasIndex(x => x.TenantId);
        builder.HasIndex(x => new { x.TenantId, x.NormalizedUserName }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.NormalizedEmail }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.EmployeeId }).IsUnique().HasFilter("\"EmployeeId\" IS NOT NULL");

        builder.HasOne(x => x.Tenant)
            .WithMany(x => x.Users)
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Employee)
            .WithOne()
            .HasForeignKey<User>(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}