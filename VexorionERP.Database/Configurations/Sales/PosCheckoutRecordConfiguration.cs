using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class PosCheckoutRecordConfiguration : TenantEntityConfiguration<PosCheckoutRecord>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<PosCheckoutRecord> builder)
    {
        builder.Property(x => x.RequestHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ResponseJson).IsRequired();

        builder.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.ShiftId });
    }
}
