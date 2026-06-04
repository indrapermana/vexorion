namespace VexorionERP.Contracts;

public class StorageTopConsumersResponse
{
    public Guid TenantId { get; set; }
    public IReadOnlyCollection<StorageTopProjectConsumerItem> TopProjects { get; set; } = [];
    public IReadOnlyCollection<StorageTopDocumentConsumerItem> TopDocuments { get; set; } = [];
}

public class StorageTopProjectConsumerItem
{
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public long TotalBytes { get; set; }
    public int DocumentCount { get; set; }
}

public class StorageTopDocumentConsumerItem
{
    public Guid ProjectDocumentId { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
}