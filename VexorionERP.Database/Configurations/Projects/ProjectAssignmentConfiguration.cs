using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class ProjectAssignmentConfiguration : TenantEntityConfiguration<ProjectAssignment>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<ProjectAssignment> builder)
    {
        builder.Property(x => x.RoleTitle).HasMaxLength(150).IsRequired();
        builder.Property(x => x.StartDate).HasColumnType("date");
        builder.Property(x => x.EndDate).HasColumnType("date");
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.ProjectId, x.StartDate });

        builder.HasOne(x => x.Project)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Consultant)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.ConsultantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}