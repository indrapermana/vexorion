using System.IO.Compression;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services.Tests;

public class DocumentUploadSecurityServiceTests
{
    [Fact]
    public async Task ValidateAsync_UsesDetectedPdfTypeInsteadOfClientMimeType()
    {
        var service = CreateService(DocumentMalwareScanStatus.Clean);

        var result = await service.ValidateAsync(File("contract.pdf", "application/octet-stream", "%PDF-1.7\n"u8.ToArray()));

        Assert.True(result.Succeeded);
        Assert.Equal("application/pdf", result.Value!.ContentType);
    }

    [Theory]
    [InlineData("contract.pdf", "not a pdf", "document.file_signature_invalid")]
    [InlineData("payload.exe", "MZ", "document.file_signature_invalid")]
    public async Task ValidateAsync_RejectsUnsupportedOrMismatchedContent(
        string fileName,
        string content,
        string expectedCode)
    {
        var result = await CreateService(DocumentMalwareScanStatus.Clean)
            .ValidateAsync(File(fileName, "application/octet-stream", System.Text.Encoding.UTF8.GetBytes(content)));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal(expectedCode, result.ErrorCode);
    }

    [Fact]
    public async Task ValidateAsync_RejectsEmptyFile()
    {
        var result = await CreateService(DocumentMalwareScanStatus.Clean)
            .ValidateAsync(File("empty.pdf", "application/pdf", []));

        Assert.False(result.Succeeded);
        Assert.Equal("document.file_empty", result.ErrorCode);
    }

    [Fact]
    public async Task ValidateAsync_EnforcesAbsoluteSizeBeforeScanning()
    {
        var scanner = new FakeMalwareScanner(DocumentMalwareScanStatus.Clean);
        var service = CreateService(scanner, new DocumentSecurityOptions { AbsoluteMaxFileSizeBytes = 4 });

        var result = await service.ValidateAsync(File("large.pdf", "application/pdf", "%PDF-"u8.ToArray()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, result.StatusCode);
        Assert.Equal("document.file_too_large", result.ErrorCode);
        Assert.Equal(0, scanner.ScanCalls);
    }

    [Fact]
    public async Task ValidateAsync_RejectsDetectedMalwareWithoutDisclosingThreatName()
    {
        var scanner = new FakeMalwareScanner(DocumentMalwareScanStatus.Infected, "Eicar-Test-Signature");
        var service = CreateService(scanner);

        var result = await service.ValidateAsync(File("contract.pdf", "application/pdf", "%PDF-1.7\n"u8.ToArray()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, result.StatusCode);
        Assert.Equal("document.malware_detected", result.ErrorCode);
        Assert.DoesNotContain("Eicar", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(DocumentMalwareScanStatus.Unavailable)]
    [InlineData(DocumentMalwareScanStatus.NotConfigured)]
    public async Task ValidateAsync_WhenScanIsRequired_FailsClosed(DocumentMalwareScanStatus scanStatus)
    {
        var service = CreateService(
            new FakeMalwareScanner(scanStatus),
            new DocumentSecurityOptions { RequireMalwareScan = true });

        var result = await service.ValidateAsync(File("contract.pdf", "application/pdf", "%PDF-1.7\n"u8.ToArray()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, result.StatusCode);
        Assert.Equal("document.malware_scan_unavailable", result.ErrorCode);
    }

    [Fact]
    public async Task ValidateAsync_WhenScanIsOptional_AllowsNotConfiguredScanner()
    {
        var result = await CreateService(DocumentMalwareScanStatus.NotConfigured)
            .ValidateAsync(File("contract.pdf", "application/pdf", "%PDF-1.7\n"u8.ToArray()));

        Assert.True(result.Succeeded);
    }

    [Theory]
    [InlineData("document.docx", "word/", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    [InlineData("workbook.xlsx", "xl/", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    [InlineData("slides.pptx", "ppt/", "application/vnd.openxmlformats-officedocument.presentationml.presentation")]
    public async Task ValidateAsync_RecognizesOpenXmlPackageStructure(
        string fileName,
        string folder,
        string expectedContentType)
    {
        var result = await CreateService(DocumentMalwareScanStatus.Clean)
            .ValidateAsync(File(fileName, "application/zip", CreateOpenXmlPackage(folder)));

        Assert.True(result.Succeeded);
        Assert.Equal(expectedContentType, result.Value!.ContentType);
    }

    private static DocumentUploadSecurityService CreateService(DocumentMalwareScanStatus status) =>
        CreateService(new FakeMalwareScanner(status), new DocumentSecurityOptions());

    private static DocumentUploadSecurityService CreateService(FakeMalwareScanner scanner) =>
        CreateService(scanner, new DocumentSecurityOptions());

    private static DocumentUploadSecurityService CreateService(
        FakeMalwareScanner scanner,
        DocumentSecurityOptions options) =>
        new(Options.Create(options), scanner);

    private static IFormFile File(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.LongLength, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private static byte[] CreateOpenXmlPackage(string folder)
    {
        using var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            archive.CreateEntry("[Content_Types].xml");
            archive.CreateEntry($"{folder}document.xml");
        }

        return stream.ToArray();
    }

    private sealed class FakeMalwareScanner(DocumentMalwareScanStatus status, string? threatName = null)
        : IDocumentMalwareScanner
    {
        public int ScanCalls { get; private set; }

        public Task<DocumentMalwareScanResult> ScanAsync(
            Stream content,
            CancellationToken cancellationToken = default)
        {
            ScanCalls++;
            return Task.FromResult(new DocumentMalwareScanResult(status, threatName));
        }
    }
}
