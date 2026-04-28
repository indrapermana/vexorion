using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InvoiceApprovalService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInvoiceApprovalService
{
    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> RequestSalesInvoiceApprovalAsync(Guid salesInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var invoice = await dbContext.SalesInvoices.FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == tenantId, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Only draft sales invoices can be submitted for approval.");

        if (await HasPendingApprovalAsync(tenantId, nameof(SalesInvoice), invoice.Id, cancellationToken))
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A pending approval already exists for this sales invoice.");

        dbContext.DocumentApprovals.Add(new DocumentApproval
        {
            TenantId = tenantId,
            DocumentType = nameof(SalesInvoice),
            DocumentId = invoice.Id,
            Status = ApprovalStatus.Pending,
            RequestedAtUtc = DateTime.UtcNow,
            RequestedByUserId = actorUserId,
            Comment = NormalizeComment(comment),
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> ApproveSalesInvoiceAsync(Guid salesInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var invoice = await dbContext.SalesInvoices.FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == tenantId, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        var pending = await GetPendingApprovalAsync(tenantId, nameof(SalesInvoice), invoice.Id, cancellationToken);
        if (pending is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "No pending approval found for this sales invoice.");

        pending.Status = ApprovalStatus.Approved;
        pending.DecidedAtUtc = DateTime.UtcNow;
        pending.DecidedByUserId = actorUserId;
        pending.Comment = MergeComment(pending.Comment, comment);

        invoice.Status = InvoiceStatus.Issued;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> RejectSalesInvoiceAsync(Guid salesInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var invoice = await dbContext.SalesInvoices.FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == tenantId, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        var pending = await GetPendingApprovalAsync(tenantId, nameof(SalesInvoice), invoice.Id, cancellationToken);
        if (pending is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "No pending approval found for this sales invoice.");

        pending.Status = ApprovalStatus.Rejected;
        pending.DecidedAtUtc = DateTime.UtcNow;
        pending.DecidedByUserId = actorUserId;
        pending.Comment = MergeComment(pending.Comment, comment);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> RequestPurchaseInvoiceApprovalAsync(Guid purchaseInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var invoice = await dbContext.PurchaseInvoices.FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == tenantId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Only draft purchase invoices can be submitted for approval.");

        if (await HasPendingApprovalAsync(tenantId, nameof(PurchaseInvoice), invoice.Id, cancellationToken))
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A pending approval already exists for this purchase invoice.");

        dbContext.DocumentApprovals.Add(new DocumentApproval
        {
            TenantId = tenantId,
            DocumentType = nameof(PurchaseInvoice),
            DocumentId = invoice.Id,
            Status = ApprovalStatus.Pending,
            RequestedAtUtc = DateTime.UtcNow,
            RequestedByUserId = actorUserId,
            Comment = NormalizeComment(comment),
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> ApprovePurchaseInvoiceAsync(Guid purchaseInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var invoice = await dbContext.PurchaseInvoices.FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == tenantId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        var pending = await GetPendingApprovalAsync(tenantId, nameof(PurchaseInvoice), invoice.Id, cancellationToken);
        if (pending is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "No pending approval found for this purchase invoice.");

        pending.Status = ApprovalStatus.Approved;
        pending.DecidedAtUtc = DateTime.UtcNow;
        pending.DecidedByUserId = actorUserId;
        pending.Comment = MergeComment(pending.Comment, comment);

        invoice.Status = InvoiceStatus.Issued;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> RejectPurchaseInvoiceAsync(Guid purchaseInvoiceId, Guid? actorUserId, string? comment, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var invoice = await dbContext.PurchaseInvoices.FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == tenantId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        var pending = await GetPendingApprovalAsync(tenantId, nameof(PurchaseInvoice), invoice.Id, cancellationToken);
        if (pending is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "No pending approval found for this purchase invoice.");

        pending.Status = ApprovalStatus.Rejected;
        pending.DecidedAtUtc = DateTime.UtcNow;
        pending.DecidedByUserId = actorUserId;
        pending.Comment = MergeComment(pending.Comment, comment);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    private Task<bool> HasPendingApprovalAsync(Guid tenantId, string documentType, Guid documentId, CancellationToken cancellationToken)
    {
        return dbContext.DocumentApprovals.AnyAsync(
            x => x.TenantId == tenantId
                 && x.DocumentType == documentType
                 && x.DocumentId == documentId
                 && x.Status == ApprovalStatus.Pending,
            cancellationToken);
    }

    private Task<DocumentApproval?> GetPendingApprovalAsync(Guid tenantId, string documentType, Guid documentId, CancellationToken cancellationToken)
    {
        return dbContext.DocumentApprovals
            .Where(x => x.TenantId == tenantId
                        && x.DocumentType == documentType
                        && x.DocumentId == documentId
                        && x.Status == ApprovalStatus.Pending)
            .OrderByDescending(x => x.RequestedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string? NormalizeComment(string? comment)
    {
        return string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
    }

    private static string? MergeComment(string? original, string? extra)
    {
        var normalizedOriginal = NormalizeComment(original);
        var normalizedExtra = NormalizeComment(extra);

        if (normalizedExtra is null)
            return normalizedOriginal;

        if (normalizedOriginal is null)
            return normalizedExtra;

        return $"{normalizedOriginal}\n---\n{normalizedExtra}";
    }
}
