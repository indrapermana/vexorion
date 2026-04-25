using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models.Organization;

namespace VexorionERP.Database.Configurations.Organization;

public class EmployeeConfiguration : TenantEntityConfiguration<Employee>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<Employee> builder)
    {
        builder.Property(x => x.EmployeeNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.LastName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.PhoneNumber).HasMaxLength(50);
        builder.Property(x => x.JobTitle).HasMaxLength(150).IsRequired();
        builder.Property(x => x.HireDate).HasColumnType("date");

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.EmployeeNumber }).IsUnique();
        builder.HasIndex(x => new { x.TenantId, x.Email });

        builder.HasOne(x => x.Company)
            .WithMany(x => x.Employees)
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany(x => x.Employees)
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}