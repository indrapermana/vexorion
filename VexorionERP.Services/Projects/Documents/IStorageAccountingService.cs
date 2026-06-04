using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public interface IStorageAccountingService
{
    /// <summary>
    /// Checks storage quota against current usage before allowing an upload.
    /// Returns a failure ServiceResult if the upload would exceed the plan limit.
    /// </summary>
    Task<ServiceResult<bool>> CheckQuotaAsync(
        Guid tenantId,
        long incomingFileSizeBytes,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a storage operation (upload or delete) in the ledger and updates the usage summary.
    /// deltaBytes is positive for uploads and negative for deletes.
    /// </summary>
    Task RecordLedgerEntryAsync(
        Guid tenantId,
        long deltaBytes,
        string operationType,
        Guid? projectId,
        Guid? projectDocumentId,
        Guid? performedByUserId,
        string? reference,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default);
}
