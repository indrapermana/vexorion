using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Organization;

namespace VexorionERP.Database.Configurations.Organization;

public class DepartmentConfiguration : TenantEntityConfiguration<Department>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Department> builder)
    {
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.Code }).IsUnique();

        builder.HasOne(x => x.Company)
            .WithMany(x => x.Departments)
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Manager)
            .WithMany()
            .HasForeignKey(x => x.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}