using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;

namespace VexorionERP.Models.Finance;

public class DocumentApproval : TenantEntityBase
{
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;
    public DateTime RequestedAtUtc { get; set; }
    public Guid? RequestedByUserId { get; set; }
    public DateTime? DecidedAtUtc { get; set; }
    public Guid? DecidedByUserId { get; set; }
    public string? Comment { get; set; }
}
