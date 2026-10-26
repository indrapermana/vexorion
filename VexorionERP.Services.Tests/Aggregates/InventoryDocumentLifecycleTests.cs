using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class InventoryDocumentLifecycleTests
{
    [Theory]
    [InlineData(DocumentStatus.Draft, DocumentStatus.Draft, true)]
    [InlineData(DocumentStatus.Draft, DocumentStatus.Completed, true)]
    [InlineData(DocumentStatus.Draft, DocumentStatus.Cancelled, true)]
    [InlineData(DocumentStatus.Completed, DocumentStatus.Completed, true)]
    [InlineData(DocumentStatus.Completed, DocumentStatus.Cancelled, true)]
    [InlineData(DocumentStatus.Cancelled, DocumentStatus.Cancelled, true)]
    [InlineData(DocumentStatus.Cancelled, DocumentStatus.Completed, false)]
    [InlineData(DocumentStatus.Draft, DocumentStatus.Confirmed, false)]
    [InlineData(DocumentStatus.Draft, DocumentStatus.PartiallyProcessed, false)]
    [InlineData(DocumentStatus.Completed, DocumentStatus.Draft, false)]
    public void CanTransition_EnforcesInventoryDocumentLifecycle(DocumentStatus currentStatus, DocumentStatus requestedStatus, bool expected)
    {
        Assert.Equal(expected, InventoryDocumentLifecycle.CanTransition(currentStatus, requestedStatus));
    }

    [Theory]
    [InlineData(DocumentStatus.Draft, DocumentStatus.Completed, true, false)]
    [InlineData(DocumentStatus.Draft, DocumentStatus.Cancelled, false, false)]
    [InlineData(DocumentStatus.Completed, DocumentStatus.Cancelled, false, true)]
    [InlineData(DocumentStatus.Completed, DocumentStatus.Completed, false, false)]
    [InlineData(DocumentStatus.Cancelled, DocumentStatus.Completed, false, false)]
    public void InventoryEffects_DistinguishPostingFromReversal(DocumentStatus previousStatus, DocumentStatus newStatus, bool posts, bool reverses)
    {
        Assert.Equal(posts, InventoryDocumentLifecycle.ShouldPost(previousStatus, newStatus));
        Assert.Equal(reverses, InventoryDocumentLifecycle.ShouldReverse(previousStatus, newStatus));
    }
}