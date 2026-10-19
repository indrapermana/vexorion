using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services.Tests;

public class AzureBlobDocumentStorageServiceTests
{
    [Fact]
    public void CreateAttachmentContentDisposition_NormalizesPathAndEncodesUnicode()
    {
        var result = AzureBlobDocumentStorageService.CreateAttachmentContentDisposition(
            "../../Laporan final ü.pdf\r\nX-Injected: true");

        Assert.StartsWith("attachment; filename*=UTF-8''", result);
        Assert.DoesNotContain("../", result);
        Assert.DoesNotContain("\r", result);
        Assert.DoesNotContain("\n", result);
        Assert.DoesNotContain("X-Injected", result);
        Assert.EndsWith("Laporan%20final%20%C3%BC.pdf", result);
    }
}
