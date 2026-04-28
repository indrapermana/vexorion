using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class NumberingService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : INumberingService
{
    public async Task<ServiceResult<string>> GenerateNextAsync(string documentType, DateOnly documentDate, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<string>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var normalizedDocumentType = NormalizeDocumentType(documentType);
        if (string.IsNullOrWhiteSpace(normalizedDocumentType))
            return ServiceResult<string>.Failure(StatusCodes.Status400BadRequest, "Document type is required.");

        var sequence = await dbContext.NumberingSequences
            .FirstOrDefaultAsync(
                x => x.TenantId == tenantId && x.DocumentType == normalizedDocumentType,
                cancellationToken);

        if (sequence is null)
        {
            sequence = CreateDefaultSequence(tenantId, normalizedDocumentType);
            dbContext.NumberingSequences.Add(sequence);
        }

        var nextNumber = sequence.NextNumber;

        var periodKey = BuildPeriodKey(sequence.ResetPeriod, documentDate);
        if (periodKey is not null)
        {
            if (string.IsNullOrWhiteSpace(sequence.CurrentPeriodKey))
            {
                sequence.CurrentPeriodKey = periodKey;
            }
            else if (!string.Equals(sequence.CurrentPeriodKey, periodKey, StringComparison.Ordinal))
            {
                sequence.CurrentPeriodKey = periodKey;
                nextNumber = 1;
                sequence.NextNumber = 1;
            }
        }

        var documentNumber = $"{ResolvePrefix(sequence.PrefixTemplate, documentDate)}{nextNumber.ToString($"D{Math.Max(1, sequence.NumberPadding)}")}";

        sequence.NextNumber = nextNumber + 1;
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<string>.Success(documentNumber);
    }

    public async Task<ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;

        var sequences = await dbContext.NumberingSequences
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .OrderBy(x => x.DocumentType)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>.Success(sequences);
    }

    public async Task<ServiceResult<NumberingSequenceResponse>> UpsertAsync(UpsertNumberingSequenceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<NumberingSequenceResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var normalizedDocumentType = NormalizeDocumentType(request.DocumentType);

        var errors = Validate(request, normalizedDocumentType);
        if (errors.Count > 0)
            return ServiceResult<NumberingSequenceResponse>.ValidationFailure(errors);

        var sequence = await dbContext.NumberingSequences
            .FirstOrDefaultAsync(
                x => x.TenantId == tenantId && x.DocumentType == normalizedDocumentType,
                cancellationToken);

        if (sequence is null)
        {
            sequence = new NumberingSequence
            {
                TenantId = tenantId,
                DocumentType = normalizedDocumentType,
            };
            dbContext.NumberingSequences.Add(sequence);
        }

        sequence.PrefixTemplate = request.PrefixTemplate.Trim();
        sequence.NextNumber = request.NextNumber;
        sequence.NumberPadding = request.NumberPadding;
        sequence.ResetPeriod = request.ResetPeriod;
        sequence.CurrentPeriodKey = null;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<NumberingSequenceResponse>.Success(ToResponse(sequence));
    }

    private static NumberingSequence CreateDefaultSequence(Guid tenantId, string documentType)
    {
        return documentType switch
        {
            "SALES_INVOICE" => new NumberingSequence
            {
                TenantId = tenantId,
                DocumentType = documentType,
                PrefixTemplate = "SI-{yyyyMM}-",
                NextNumber = 1,
                NumberPadding = 4,
                ResetPeriod = NumberingResetPeriod.Monthly,
            },
            "PURCHASE_INVOICE" => new NumberingSequence
            {
                TenantId = tenantId,
                DocumentType = documentType,
                PrefixTemplate = "PI-{yyyyMM}-",
                NextNumber = 1,
                NumberPadding = 4,
                ResetPeriod = NumberingResetPeriod.Monthly,
            },
            "JOURNAL_ENTRY" => new NumberingSequence
            {
                TenantId = tenantId,
                DocumentType = documentType,
                PrefixTemplate = "JRN-{yyyyMMdd}-",
                NextNumber = 1,
                NumberPadding = 4,
                ResetPeriod = NumberingResetPeriod.Daily,
            },
            _ => new NumberingSequence
            {
                TenantId = tenantId,
                DocumentType = documentType,
                PrefixTemplate = $"{documentType}-",
                NextNumber = 1,
                NumberPadding = 4,
                ResetPeriod = NumberingResetPeriod.None,
            },
        };
    }

    private static string ResolvePrefix(string template, DateOnly documentDate)
    {
        return template
            .Replace("{yyyyMMdd}", documentDate.ToString("yyyyMMdd"), StringComparison.Ordinal)
            .Replace("{yyyyMM}", documentDate.ToString("yyyyMM"), StringComparison.Ordinal)
            .Replace("{yyyy}", documentDate.ToString("yyyy"), StringComparison.Ordinal)
            .Replace("{MM}", documentDate.ToString("MM"), StringComparison.Ordinal)
            .Replace("{dd}", documentDate.ToString("dd"), StringComparison.Ordinal);
    }

    private static string? BuildPeriodKey(NumberingResetPeriod resetPeriod, DateOnly documentDate)
    {
        return resetPeriod switch
        {
            NumberingResetPeriod.None => null,
            NumberingResetPeriod.Yearly => documentDate.ToString("yyyy"),
            NumberingResetPeriod.Monthly => documentDate.ToString("yyyyMM"),
            NumberingResetPeriod.Daily => documentDate.ToString("yyyyMMdd"),
            _ => null,
        };
    }

    private static string NormalizeDocumentType(string value)
    {
        return value.Trim().ToUpperInvariant().Replace('-', '_');
    }

    private static Dictionary<string, string[]> Validate(UpsertNumberingSequenceRequest request, string normalizedDocumentType)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(normalizedDocumentType))
            errors[nameof(UpsertNumberingSequenceRequest.DocumentType)] = ["Document type is required."];

        if (string.IsNullOrWhiteSpace(request.PrefixTemplate))
            errors[nameof(UpsertNumberingSequenceRequest.PrefixTemplate)] = ["Prefix template is required."];

        if (request.NextNumber < 1)
            errors[nameof(UpsertNumberingSequenceRequest.NextNumber)] = ["Next number must be at least 1."];

        if (request.NumberPadding is < 1 or > 12)
            errors[nameof(UpsertNumberingSequenceRequest.NumberPadding)] = ["Number padding must be between 1 and 12."];

        return errors;
    }

    private static NumberingSequenceResponse ToResponse(NumberingSequence sequence)
    {
        return new NumberingSequenceResponse
        {
            Id = sequence.Id,
            DocumentType = sequence.DocumentType,
            PrefixTemplate = sequence.PrefixTemplate,
            NextNumber = sequence.NextNumber,
            NumberPadding = sequence.NumberPadding,
            ResetPeriod = sequence.ResetPeriod,
            CurrentPeriodKey = sequence.CurrentPeriodKey,
        };
    }
}
