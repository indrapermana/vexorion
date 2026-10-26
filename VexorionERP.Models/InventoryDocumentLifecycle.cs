namespace VexorionERP.Models;

public static class InventoryDocumentLifecycle
{
    public static bool CanTransition(DocumentStatus currentStatus, DocumentStatus requestedStatus)
    {
        if (currentStatus == requestedStatus)
        {
            return true;
        }

        return currentStatus switch
        {
            DocumentStatus.Draft => requestedStatus is DocumentStatus.Completed or DocumentStatus.Cancelled,
            DocumentStatus.Completed => requestedStatus == DocumentStatus.Cancelled,
            _ => false,
        };
    }

    public static bool ShouldPost(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Draft && newStatus == DocumentStatus.Completed;

    public static bool ShouldReverse(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Completed && newStatus == DocumentStatus.Cancelled;
}