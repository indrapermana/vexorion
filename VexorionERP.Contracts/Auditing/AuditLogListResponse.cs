namespace VexorionERP.Contracts;

public class AuditLogListResponse
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public IReadOnlyCollection<AuditLogListItemResponse> Items { get; set; } = [];
}
