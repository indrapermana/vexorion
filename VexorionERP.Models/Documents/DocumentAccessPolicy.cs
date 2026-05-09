using VexorionERP.Models;

namespace VexorionERP.Models;

public class DocumentAccessPolicy : TenantEntityBase
{
    public Guid ProjectDocumentId { get; set; }
    public Guid SubjectTenantId { get; set; }
    public bool CanView { get; set; }
    public bool CanDownload { get; set; }
    public bool CanUploadVersion { get; set; }
    public DateTime? ValidFromUtc { get; set; }
    public DateTime? ValidToUtc { get; set; }

    public ProjectDocument? ProjectDocument { get; set; }
    public Tenant? SubjectTenant { get; set; }
}