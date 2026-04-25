using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Database.Configurations.Inventory;

public class WarehouseConfiguration : TenantEntityConfiguration<Warehouse>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Warehouse> builder)
    {
        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.LocationDescription).HasMaxLength(300);

        builder.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
    }
}