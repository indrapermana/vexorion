using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VexorionERP.Models;

namespace VexorionERP.Database;

public class DocumentApprovalConfiguration : TenantEntityConfiguration<DocumentApproval>
{
    protected override void ConfigureTenantEntity(EntityTypeBuilder<DocumentApproval> builder)
    {
        builder.Property(x => x.DocumentType).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Comment).HasMaxLength(1000);

        builder.HasIndex(x => new { x.TenantId, x.DocumentType, x.DocumentId, x.Status });
        builder.HasIndex(x => new { x.TenantId, x.DocumentType, x.DocumentId, x.RequestedAtUtc });
    }
}
