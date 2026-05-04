using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Configuration.Imports;

public class ImportJobServiceTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static AppDbContext CreateInMemoryDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (AppDbContext db, SqliteConnection conn) CreateSqliteDbContext()
    {
        var conn = new SqliteConnection("DataSource=:memory:");
        conn.Open();
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(conn)
            .Options);
        db.Database.EnsureCreated();
        return (db, conn);
    }

    private static ImportJobService CreateService(
        AppDbContext db,
        Guid? tenantId = null,
        IImportWorkbookService? workbook = null,
        IImportValidationEngine? engine = null,
        IEnumerable<IImportExecutor>? executors = null) =>
        new(
            db,
            new FakeTenantProvider(tenantId ?? Guid.NewGuid()),
            workbook ?? new FakeImportWorkbookService(),
            engine ?? new FakeImportValidationEngine(),
            executors ?? [],
            new FakeAuditLogger());

    private static ImportJobService CreateServiceNoTenant(AppDbContext db) =>
        new(
            db,
            new FakeTenantProvider(null),
            new FakeImportWorkbookService(),
            new FakeImportValidationEngine(),
            [],
            new FakeAuditLogger());

    // ── GetAvailableImportTypesAsync ──────────────────────────────────────────

    [Fact]
    public async Task GetAvailableImportTypesAsync_Returns5SupportedTypes()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.GetAvailableImportTypesAsync();

        Assert.True(result.Succeeded);
        Assert.Equal(5, result.Value!.Count);
        Assert.Contains(result.Value, x => x.ImportType == "customer");
        Assert.Contains(result.Value, x => x.ImportType == "product");
        Assert.Contains(result.Value, x => x.ImportType == "supplier");
        Assert.Contains(result.Value, x => x.ImportType == "sales-order");
        Assert.Contains(result.Value, x => x.ImportType == "purchase-order");
    }

    [Fact]
    public async Task GetAvailableImportTypesAsync_TypesAreOrderedAlphabetically()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.GetAvailableImportTypesAsync();

        var keys = result.Value!.Select(x => x.ImportType).ToList();
        Assert.Equal(keys.OrderBy(k => k, StringComparer.OrdinalIgnoreCase).ToList(), keys);
    }

    // ── DownloadTemplateAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task DownloadTemplateAsync_EmptyType_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.DownloadTemplateAsync("");

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task DownloadTemplateAsync_UnknownType_Returns404()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.DownloadTemplateAsync("nonexistent-type");

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task DownloadTemplateAsync_ValidType_ReturnsTemplate()
    {
        using var db = CreateInMemoryDbContext();
        var workbook = new FakeImportWorkbookService { TemplateName = "customer-template.xlsx" };
        var svc = CreateService(db, workbook: workbook);

        var result = await svc.DownloadTemplateAsync("customer");

        Assert.True(result.Succeeded);
        Assert.Equal("customer-template.xlsx", result.Value!.FileName);
    }

    [Fact]
    public async Task DownloadTemplateAsync_TypeIsCaseInsensitive()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.DownloadTemplateAsync("CUSTOMER");

        Assert.True(result.Succeeded);
    }

    // ── ValidateAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidateAsync_NoTenant_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateServiceNoTenant(db);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "customer",
            FileName = "test.xlsx",
            FileContent = [1, 2, 3],
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ValidateAsync_UnknownImportType_Returns404()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "unknown-entity",
            FileName = "file.xlsx",
            FileContent = [1, 2, 3],
        });

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task ValidateAsync_NonXlsxFile_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "customer",
            FileName = "file.csv",
            FileContent = [1, 2, 3],
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ValidateAsync_EmptyFileContent_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "customer",
            FileName = "file.xlsx",
            FileContent = [],
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ValidateAsync_CorruptExcelFile_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var workbook = new FakeImportWorkbookService { ThrowOnRead = true };
        var svc = CreateService(db, workbook: workbook);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "customer",
            FileName = "file.xlsx",
            FileContent = [0xFF, 0xFE],
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ValidateAsync_ValidFile_PersistsJobAndReturnsValidatedStatus()
    {
        var tenantId = Guid.NewGuid();
        using var db = CreateInMemoryDbContext();

        var workbook = new FakeImportWorkbookService
        {
            ReadResult = new ImportWorkbookReadResult(
                ["CustomerNumber", "Name", "Email", "PhoneNumber", "BillingAddress"],
                [new ImportWorkbookRow(2, new Dictionary<string, string> { ["CustomerNumber"] = "C001" })]),
        };
        var svc = CreateService(db, tenantId: tenantId, workbook: workbook);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "customer",
            FileName = "customers.xlsx",
            FileContent = [1, 2, 3],
        });

        Assert.True(result.Succeeded);
        Assert.Equal(ImportJobStatus.Validated, result.Value!.Status);
        Assert.Equal(1, result.Value.TotalRows);
        Assert.Equal(1, result.Value.ValidRows);
        Assert.Equal(0, result.Value.InvalidRows);
        Assert.Equal(1, await db.ImportJobs.CountAsync());
    }

    [Fact]
    public async Task ValidateAsync_WithValidationErrors_SetsFailedValidationStatus()
    {
        var tenantId = Guid.NewGuid();
        using var db = CreateInMemoryDbContext();

        var workbook = new FakeImportWorkbookService
        {
            ReadResult = new ImportWorkbookReadResult(
                ["CustomerNumber"],
                [new ImportWorkbookRow(2, new Dictionary<string, string> { ["CustomerNumber"] = "" })]),
        };
        var engine = new FakeImportValidationEngine
        {
            Errors = [new ImportValidationErrorResponse
            {
                RowNumber = 2,
                ColumnName = "CustomerNumber",
                Category = "Required",
                Message = "CustomerNumber is required.",
            }],
        };
        var svc = CreateService(db, tenantId: tenantId, workbook: workbook, engine: engine);

        var result = await svc.ValidateAsync(new ValidateImportFileRequest
        {
            ImportType = "customer",
            FileName = "customers.xlsx",
            FileContent = [1, 2, 3],
        });

        Assert.True(result.Succeeded);
        Assert.Equal(ImportJobStatus.FailedValidation, result.Value!.Status);
        Assert.Equal(1, result.Value.InvalidRows);
        Assert.Single(result.Value.Errors);
        Assert.NotNull(result.Value.ErrorWorkbookContent);
    }

    // ── GetStatusAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatusAsync_NoTenant_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateServiceNoTenant(db);

        var result = await svc.GetStatusAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetStatusAsync_JobNotFound_Returns404()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateService(db);

        var result = await svc.GetStatusAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetStatusAsync_OtherTenantJob_Returns404()
    {
        using var db = CreateInMemoryDbContext();
        var job = new ImportJob
        {
            TenantId = Guid.NewGuid(),
            ImportType = "customer",
            SourceFileName = "file.xlsx",
            Status = ImportJobStatus.Validated,
        };
        db.ImportJobs.Add(job);
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: Guid.NewGuid());
        var result = await svc.GetStatusAsync(job.Id);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetStatusAsync_ValidJob_ReturnsCorrectStatus()
    {
        var tenantId = Guid.NewGuid();
        using var db = CreateInMemoryDbContext();
        var job = new ImportJob
        {
            TenantId = tenantId,
            ImportType = "product",
            SourceFileName = "products.xlsx",
            Status = ImportJobStatus.Validated,
            TotalRows = 10,
            ValidRows = 10,
        };
        db.ImportJobs.Add(job);
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.GetStatusAsync(job.Id);

        Assert.True(result.Succeeded);
        Assert.Equal(ImportJobStatus.Validated, result.Value!.Status);
        Assert.Equal(10, result.Value.TotalRows);
    }

    // ── GetHistoryAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetHistoryAsync_NoTenant_Returns400()
    {
        using var db = CreateInMemoryDbContext();
        var svc = CreateServiceNoTenant(db);

        var result = await svc.GetHistoryAsync(null, 1, 20);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetHistoryAsync_ReturnsOnlyTenantJobs()
    {
        var tenantId = Guid.NewGuid();
        using var db = CreateInMemoryDbContext();
        db.ImportJobs.AddRange(
            new ImportJob { TenantId = tenantId, ImportType = "customer", SourceFileName = "a.xlsx", Status = ImportJobStatus.Imported },
            new ImportJob { TenantId = Guid.NewGuid(), ImportType = "customer", SourceFileName = "b.xlsx", Status = ImportJobStatus.Imported });
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.GetHistoryAsync(null, 1, 20);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task GetHistoryAsync_FiltersByImportType()
    {
        var tenantId = Guid.NewGuid();
        using var db = CreateInMemoryDbContext();
        db.ImportJobs.AddRange(
            new ImportJob { TenantId = tenantId, ImportType = "customer", SourceFileName = "a.xlsx", Status = ImportJobStatus.Imported },
            new ImportJob { TenantId = tenantId, ImportType = "product", SourceFileName = "b.xlsx", Status = ImportJobStatus.Imported });
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.GetHistoryAsync("customer", 1, 20);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
        Assert.All(result.Value!, x => Assert.Equal("customer", x.ImportType));
    }

    [Fact]
    public async Task GetHistoryAsync_ClampsPaginationSize()
    {
        var tenantId = Guid.NewGuid();
        using var db = CreateInMemoryDbContext();
        for (var i = 0; i < 5; i++)
        {
            db.ImportJobs.Add(new ImportJob
            {
                TenantId = tenantId,
                ImportType = "customer",
                SourceFileName = $"{i}.xlsx",
                Status = ImportJobStatus.Imported,
            });
        }
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.GetHistoryAsync(null, 1, 2);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Count);
    }

    private static async Task SeedTenantAsync(AppDbContext db, Guid tenantId)
    {
        db.Set<Tenant>().Add(new Tenant { Id = tenantId, Name = "Test Tenant", Code = "TEST" });
        await db.SaveChangesAsync();
    }

    // ── SubmitAsync (requires SQLite — ExecuteUpdateAsync not supported by InMemory) ──

    [Fact]
    public async Task SubmitAsync_NoTenant_Returns400()
    {
        var (db, conn) = CreateSqliteDbContext();
        await using var _ = conn;
        await using var __ = db;

        var svc = CreateServiceNoTenant(db);
        var result = await svc.SubmitAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task SubmitAsync_JobNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var (db, conn) = CreateSqliteDbContext();
        await using var _ = conn;
        await using var __ = db;
        await SeedTenantAsync(db, tenantId);

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.SubmitAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task SubmitAsync_WrongStatus_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var (db, conn) = CreateSqliteDbContext();
        await using var _ = conn;
        await using var __ = db;
        await SeedTenantAsync(db, tenantId);

        var job = new ImportJob
        {
            TenantId = tenantId,
            ImportType = "customer",
            SourceFileName = "file.xlsx",
            Status = ImportJobStatus.FailedValidation,
        };
        db.ImportJobs.Add(job);
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.SubmitAsync(job.Id);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task SubmitAsync_AlreadySubmitted_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var (db, conn) = CreateSqliteDbContext();
        await using var _ = conn;
        await using var __ = db;
        await SeedTenantAsync(db, tenantId);

        var job = new ImportJob
        {
            TenantId = tenantId,
            ImportType = "customer",
            SourceFileName = "file.xlsx",
            Status = ImportJobStatus.Imported,
            SubmittedAtUtc = DateTime.UtcNow,
        };
        db.ImportJobs.Add(job);
        await db.SaveChangesAsync();

        var svc = CreateService(db, tenantId: tenantId);
        var result = await svc.SubmitAsync(job.Id);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task SubmitAsync_ValidatedJob_ExecutesAndReturnsImported()
    {
        var tenantId = Guid.NewGuid();
        var (db, conn) = CreateSqliteDbContext();
        await using var _ = conn;
        await using var __ = db;
        await SeedTenantAsync(db, tenantId);

        var job = new ImportJob
        {
            TenantId = tenantId,
            ImportType = "customer",
            SourceFileName = "file.xlsx",
            Status = ImportJobStatus.Validated,
            ValidatedRowsJson = """[{"RowNumber":2,"Values":{"CustomerNumber":"C001"}}]""",
            TotalRows = 1,
            ValidRows = 1,
        };
        db.ImportJobs.Add(job);
        await db.SaveChangesAsync();

        var executor = new FakeImportExecutor("customer");
        var svc = CreateService(db, tenantId: tenantId, executors: [executor]);
        var result = await svc.SubmitAsync(job.Id);

        Assert.True(result.Succeeded);
        Assert.Equal(ImportJobStatus.Imported, result.Value!.Status);
        Assert.Equal(1, executor.ExecuteCalls);
    }

    [Fact]
    public async Task SubmitAsync_DuplicateSubmit_SecondCallReturns409()
    {
        var tenantId = Guid.NewGuid();
        var (db, conn) = CreateSqliteDbContext();
        await using var _ = conn;
        await using var __ = db;
        await SeedTenantAsync(db, tenantId);

        var job = new ImportJob
        {
            TenantId = tenantId,
            ImportType = "customer",
            SourceFileName = "file.xlsx",
            Status = ImportJobStatus.Validated,
            ValidatedRowsJson = """[{"RowNumber":2,"Values":{"CustomerNumber":"C001"}}]""",
            TotalRows = 1,
            ValidRows = 1,
        };
        db.ImportJobs.Add(job);
        await db.SaveChangesAsync();

        var executor = new FakeImportExecutor("customer");
        var svc = CreateService(db, tenantId: tenantId, executors: [executor]);

        var first = await svc.SubmitAsync(job.Id);
        var second = await svc.SubmitAsync(job.Id);

        Assert.True(first.Succeeded);
        Assert.False(second.Succeeded);
        Assert.Equal(409, second.StatusCode);
        Assert.Equal(1, executor.ExecuteCalls); // executed only once
    }
}
