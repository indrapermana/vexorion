namespace VexorionERP.Contracts;

public class StorageUsageTrendResponse
{
    public Guid TenantId { get; set; }
    public IReadOnlyCollection<StorageUsageTrendPoint> Points { get; set; } = [];
}

public class StorageUsageTrendPoint
{
    public DateTime Date { get; set; }
    public long UsedBytes { get; set; }
    public string? OperationType { get; set; }
}
