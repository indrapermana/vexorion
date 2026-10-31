using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class PosCashMovementConfiguration : TenantEntityConfiguration<PosCashMovement>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PosCashMovement> builder)
    {
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Reason).HasMaxLength(500).IsRequired();
        builder.HasIndex(x => new { x.TenantId, x.ShiftId, x.OccurredAtUtc });
        builder.HasOne<ShiftSession>().WithMany().HasForeignKey(x => x.ShiftId).OnDelete(DeleteBehavior.Restrict);
    }
}
