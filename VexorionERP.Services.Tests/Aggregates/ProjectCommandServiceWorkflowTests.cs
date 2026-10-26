using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class ProjectCommandServiceWorkflowTests
{
    static ProjectCommandServiceWorkflowTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, ProjectCommandService svc, Guid tenantId) Build(string? dbName = null)
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, dbName ?? Guid.NewGuid().ToString());
        var svc = new ProjectCommandService(
            new FixedTenantProvider(tenantId),
            new NoOpAuditLogger(),
            new HttpContextAccessor(),
            new ProjectDocumentCommandService(new FixedTenantProvider(tenantId), new NoOpAuditLogger(), new HttpContextAccessor(), new NoOpDocumentStorageService(), new StorageAccountingService()));

        return (db, svc, tenantId);
    }

    private sealed class NoOpDocumentStorageService : IDocumentStorageService
    {
        public Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(Guid tenantId, string sourceType, string fileName, Stream content, string contentType, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ServiceResult<string>> GetDownloadUrlAsync(string blobPath, string? downloadFileName = null, string? contentType = null, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default) =>
            Task.FromResult(ServiceResult<bool>.Success(true));
    }

    [Fact]
    public async Task Update_InvalidProjectStatusTransition_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var categoryId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        db.ProjectCategories.Add(new ProjectCategory
        {
            Id = categoryId,
            TenantId = tenantId,
            Code = "CAT",
            Name = "Category"
        });

        db.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = categoryId,
            ProjectNumber = "PRJ-001",
            Name = "Legacy Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Completed
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(projectId, new UpdateProjectRequest
        {
            ProjectCategoryId = categoryId,
            ProjectNumber = "PRJ-001",
            Name = "Legacy Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            EndDate = null,
            Status = ProjectLifecycleStatus.InReview,
            Notes = null,
            IsActive = true
        }, db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Contains("Invalid status transition", result.ErrorMessage);
    }

    [Fact]
    public async Task Update_ValidProjectStatusTransition_Succeeds()
    {
        var (db, svc, tenantId) = Build();
        var categoryId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        db.ProjectCategories.Add(new ProjectCategory
        {
            Id = categoryId,
            TenantId = tenantId,
            Code = "CAT",
            Name = "Category"
        });

        db.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = categoryId,
            ProjectNumber = "PRJ-002",
            Name = "New Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(projectId, new UpdateProjectRequest
        {
            ProjectCategoryId = categoryId,
            ProjectNumber = "PRJ-002",
            Name = "New Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            EndDate = null,
            Status = ProjectLifecycleStatus.InReview,
            Notes = "ready for review",
            IsActive = true
        }, db);

        Assert.True(result.Succeeded);

        var updated = db.Projects.Single(x => x.Id == projectId);
        Assert.Equal(ProjectLifecycleStatus.InReview, updated.Status);
    }
}
