using System.IO.Compression;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace VexorionERP.Services;

public sealed class DocumentUploadSecurityService(
    IOptions<DocumentSecurityOptions> options) : IDocumentUploadSecurityService
{
    private static readonly IReadOnlyDictionary<string, string> SimpleContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = "application/pdf",
            [".png"] = "image/png",
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".txt"] = "text/plain",
            [".csv"] = "text/csv"
        };

    private static readonly IReadOnlyDictionary<string, (string ContentType, string RequiredFolder)> OpenXmlContentTypes =
        new Dictionary<string, (string, string)>(StringComparer.OrdinalIgnoreCase)
        {
            [".docx"] = ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "word/"),
            [".xlsx"] = ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xl/"),
            [".pptx"] = ("application/vnd.openxmlformats-officedocument.presentationml.presentation", "ppt/")
        };

    public async Task<ServiceResult<DocumentUploadSecurityResult>> ValidateAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
        {
            return ServiceResult<DocumentUploadSecurityResult>.Failure(
                StatusCodes.Status400BadRequest,
                "The uploaded file is empty.",
                "document.file_empty");
        }

        if (file.Length > options.Value.AbsoluteMaxFileSizeBytes)
        {
            return ServiceResult<DocumentUploadSecurityResult>.Failure(
                StatusCodes.Status413PayloadTooLarge,
                $"The file exceeds the absolute upload limit of {FormatBytes(options.Value.AbsoluteMaxFileSizeBytes)}.",
                "document.file_too_large");
        }

        var extension = Path.GetExtension(Path.GetFileName(file.FileName.Replace('\\', '/')));
        string? contentType;
        await using (var content = file.OpenReadStream())
        {
            contentType = await DetectContentTypeAsync(extension, content, cancellationToken);
        }

        if (contentType is null)
        {
            return ServiceResult<DocumentUploadSecurityResult>.Failure(
                StatusCodes.Status400BadRequest,
                "The file type is unsupported or its contents do not match its extension.",
                "document.file_signature_invalid");
        }

        return ServiceResult<DocumentUploadSecurityResult>.Success(new DocumentUploadSecurityResult(contentType));
    }

    private static async Task<string?> DetectContentTypeAsync(
        string extension,
        Stream content,
        CancellationToken cancellationToken)
    {
        if (OpenXmlContentTypes.TryGetValue(extension, out var openXml))
            return IsExpectedOpenXmlPackage(content, openXml.RequiredFolder) ? openXml.ContentType : null;

        if (!SimpleContentTypes.TryGetValue(extension, out var expectedContentType))
            return null;

        var header = new byte[8];
        var bytesRead = await content.ReadAsync(header, cancellationToken);
        return extension.ToLowerInvariant() switch
        {
            ".pdf" when StartsWith(header, bytesRead, "%PDF-"u8) => expectedContentType,
            ".png" when StartsWith(header, bytesRead, new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }) => expectedContentType,
            ".jpg" or ".jpeg" when bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF => expectedContentType,
            ".txt" or ".csv" when await IsSafeTextAsync(content, header, bytesRead, cancellationToken) => expectedContentType,
            _ => null
        };
    }

    private static bool IsExpectedOpenXmlPackage(Stream content, string requiredFolder)
    {
        try
        {
            using var archive = new ZipArchive(content, ZipArchiveMode.Read, leaveOpen: true);
            return archive.GetEntry("[Content_Types].xml") is not null
                && archive.Entries.Any(entry => entry.FullName.StartsWith(requiredFolder, StringComparison.OrdinalIgnoreCase));
        }
        catch (InvalidDataException)
        {
            return false;
        }
    }

    private static async Task<bool> IsSafeTextAsync(
        Stream content,
        byte[] header,
        int headerLength,
        CancellationToken cancellationToken)
    {
        using var sample = new MemoryStream();
        await sample.WriteAsync(header.AsMemory(0, headerLength), cancellationToken);
        var buffer = new byte[4096];
        var remaining = 64 * 1024 - headerLength;
        while (remaining > 0)
        {
            var read = await content.ReadAsync(buffer.AsMemory(0, Math.Min(buffer.Length, remaining)), cancellationToken);
            if (read == 0)
                break;
            await sample.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            remaining -= read;
        }

        var bytes = sample.ToArray();
        if (bytes.Contains((byte)0))
            return false;

        try
        {
            _ = new UTF8Encoding(false, true).GetString(bytes);
            return true;
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
    }

    private static bool StartsWith(byte[] value, int valueLength, ReadOnlySpan<byte> prefix) =>
        valueLength >= prefix.Length && value.AsSpan(0, prefix.Length).SequenceEqual(prefix);

    private static string FormatBytes(long bytes) => bytes % (1024 * 1024) == 0
        ? $"{bytes / (1024 * 1024)} MB"
        : $"{bytes} bytes";
}
