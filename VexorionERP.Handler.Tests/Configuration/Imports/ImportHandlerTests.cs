using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Configuration.Imports;

public class ImportHandlerTests
{
    private static IServiceProvider BuildProvider(IImportJobService svc)
    {
        var services = new ServiceCollection();
        services.AddSingleton(svc);
        return services.BuildServiceProvider();
    }

    // ── GetAvailableImportTypesQueryHandler ───────────────────────────────────

    [Fact]
    public async Task GetAvailableImportTypesQueryHandler_DelegatesToService()
    {
        var fakeService = new FakeImportJobService
        {
            AvailableTypesResult = ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>.Success(
            [
                new AvailableImportTypeResponse { ImportType = "customer", Columns = ["CustomerNumber"] },
            ]),
        };

        var handler = new GetAvailableImportTypesQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new GetAvailableImportTypesQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
        Assert.Equal("customer", result.Value!.First().ImportType);
    }

    // ── DownloadImportTemplateQueryHandler ────────────────────────────────────

    [Fact]
    public async Task DownloadImportTemplateQueryHandler_DelegatesToService()
    {
        var fakeService = new FakeImportJobService
        {
            TemplateResult = ServiceResult<ImportTemplateResponse>.Success(new ImportTemplateResponse
            {
                ImportType = "product",
                FileName = "product-template.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                Content = [1, 2, 3],
            }),
        };

        var handler = new DownloadImportTemplateQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new DownloadImportTemplateQuery("product"), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("product-template.xlsx", result.Value!.FileName);
    }

    [Fact]
    public async Task DownloadImportTemplateQueryHandler_PropagatesFailure()
    {
        var fakeService = new FakeImportJobService
        {
            TemplateResult = ServiceResult<ImportTemplateResponse>.Failure(404, "Unsupported import type 'bad'."),
        };

        var handler = new DownloadImportTemplateQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new DownloadImportTemplateQuery("bad"), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    // ── ValidateImportFileCommandHandler ─────────────────────────────────────

    [Fact]
    public async Task ValidateImportFileCommandHandler_DelegatesToService()
    {
        var jobId = Guid.NewGuid();
        var fakeService = new FakeImportJobService
        {
            ValidateResult = ServiceResult<ImportValidationResultResponse>.Success(new ImportValidationResultResponse
            {
                ImportJobId = jobId,
                ImportType = "customer",
                Status = ImportJobStatus.Validated,
                TotalRows = 5,
                ValidRows = 5,
            }),
        };

        var handler = new ValidateImportFileCommandHandler(BuildProvider(fakeService));
        var result = await handler.Handle(
            new ValidateImportFileCommand(new ValidateImportFileRequest
            {
                ImportType = "customer",
                FileName = "a.xlsx",
                FileContent = [1],
            }),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(jobId, result.Value!.ImportJobId);
        Assert.Equal(5, result.Value.TotalRows);
    }

    // ── SubmitImportJobCommandHandler ─────────────────────────────────────────

    [Fact]
    public async Task SubmitImportJobCommandHandler_DelegatesToService()
    {
        var jobId = Guid.NewGuid();
        var fakeService = new FakeImportJobService
        {
            SubmitResult = ServiceResult<ImportJobStatusResponse>.Success(new ImportJobStatusResponse
            {
                ImportJobId = jobId,
                Status = ImportJobStatus.Imported,
                TotalRows = 3,
                ValidRows = 3,
            }),
        };

        var handler = new SubmitImportJobCommandHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new SubmitImportJobCommand(jobId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(ImportJobStatus.Imported, result.Value!.Status);
    }

    [Fact]
    public async Task SubmitImportJobCommandHandler_PropagatesConflict()
    {
        var jobId = Guid.NewGuid();
        var fakeService = new FakeImportJobService
        {
            SubmitResult = ServiceResult<ImportJobStatusResponse>.Failure(409, "Already submitted."),
        };

        var handler = new SubmitImportJobCommandHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new SubmitImportJobCommand(jobId), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    // ── GetImportJobStatusQueryHandler ────────────────────────────────────────

    [Fact]
    public async Task GetImportJobStatusQueryHandler_DelegatesToService()
    {
        var jobId = Guid.NewGuid();
        var fakeService = new FakeImportJobService
        {
            StatusResult = ServiceResult<ImportJobStatusResponse>.Success(new ImportJobStatusResponse
            {
                ImportJobId = jobId,
                Status = ImportJobStatus.Validated,
            }),
        };

        var handler = new GetImportJobStatusQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new GetImportJobStatusQuery(jobId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(jobId, result.Value!.ImportJobId);
    }

    [Fact]
    public async Task GetImportJobStatusQueryHandler_PropagatesNotFound()
    {
        var fakeService = new FakeImportJobService
        {
            StatusResult = ServiceResult<ImportJobStatusResponse>.Failure(404, "Import job was not found."),
        };

        var handler = new GetImportJobStatusQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new GetImportJobStatusQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    // ── GetImportHistoryQueryHandler ──────────────────────────────────────────

    [Fact]
    public async Task GetImportHistoryQueryHandler_DelegatesToService()
    {
        var fakeService = new FakeImportJobService
        {
            HistoryResult = ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>.Success(
            [
                new ImportJobHistoryItemResponse { ImportType = "customer", Status = ImportJobStatus.Imported },
                new ImportJobHistoryItemResponse { ImportType = "customer", Status = ImportJobStatus.FailedValidation },
            ]),
        };

        var handler = new GetImportHistoryQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new GetImportHistoryQuery("customer", 1, 20), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Count);
    }

    [Fact]
    public async Task GetImportHistoryQueryHandler_PropagatesTenantMissing()
    {
        var fakeService = new FakeImportJobService
        {
            HistoryResult = ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>.Failure(400, "Tenant context is required."),
        };

        var handler = new GetImportHistoryQueryHandler(BuildProvider(fakeService));
        var result = await handler.Handle(new GetImportHistoryQuery(null, 1, 20), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }
}
