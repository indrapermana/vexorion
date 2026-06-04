using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class ProjectAssignmentCommandServiceSecurityTests
{
    static ProjectAssignmentCommandServiceSecurityTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, ProjectAssignmentCommandService svc, Guid tenantId) Build(string? dbName = null)
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, dbName ?? Guid.NewGuid().ToString());
        var svc = new ProjectAssignmentCommandService(
            db,
            new FixedTenantProvider(tenantId),
            new NoOpAuditLogger(),
            new HttpContextAccessor());

        return (db, svc, tenantId);
    }

    [Fact]
    public async Task Create_ExternalConsultantWithoutRelationship_Returns403()
    {
        var (db, svc, tenantId) = Build();
        var projectId = SeedProject(db, tenantId);
        var externalTenantId = Guid.NewGuid();
        var consultantId = SeedConsultant(db, externalTenantId);
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(
            projectId,
            new CreateProjectAssignmentRequest
            {
                ConsultantId = consultantId,
                RoleTitle = "External Advisor",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                EndDate = null,
                IsPrimaryAssignment = false,
                Notes = ""
            });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
    }

    [Fact]
    public async Task Create_ExternalConsultantWithActiveRelationshipAndScope_AllowsAssignment()
    {
        var (db, svc, tenantId) = Build();
        var projectId = SeedProject(db, tenantId);
        var externalTenantId = Guid.NewGuid();
        var consultantId = SeedConsultant(db, externalTenantId);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        db.ProjectParties.Add(new ProjectParty
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProjectId = projectId,
            RelatedTenantId = externalTenantId,
            RelationshipType = TenantRelationshipType.DeliveryPartner,
            CanAssignPeople = true,
            CanUploadDocuments = false,
            CanViewDocuments = true,
            EffectiveFrom = today.AddDays(-1),
            EffectiveTo = today.AddDays(30),
            IsActive = true
        });

        db.TenantRelationships.Add(new TenantRelationship
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RelatedTenantId = externalTenantId,
            RelationshipType = TenantRelationshipType.DeliveryPartner,
            Status = TenantRelationshipStatus.Active,
            EffectiveFrom = today.AddDays(-1),
            EffectiveTo = today.AddDays(30),
            ScopeJson = "{\"canAssignPeople\":true}",
            IsActive = true
        });

        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(
            projectId,
            new CreateProjectAssignmentRequest
            {
                ConsultantId = consultantId,
                RoleTitle = "External Advisor",
                StartDate = today,
                EndDate = null,
                IsPrimaryAssignment = false,
                Notes = "Allowed"
            });

        Assert.True(result.Succeeded);
        Assert.Single(db.ProjectAssignments);
        Assert.Equal(consultantId, db.ProjectAssignments.Single().ConsultantId);
    }

    [Fact]
    public async Task Create_ExternalConsultantWithScopeDeny_Returns403()
    {
        var (db, svc, tenantId) = Build();
        var projectId = SeedProject(db, tenantId);
        var externalTenantId = Guid.NewGuid();
        var consultantId = SeedConsultant(db, externalTenantId);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        db.ProjectParties.Add(new ProjectParty
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProjectId = projectId,
            RelatedTenantId = externalTenantId,
            RelationshipType = TenantRelationshipType.DeliveryPartner,
            CanAssignPeople = true,
            CanUploadDocuments = false,
            CanViewDocuments = true,
            EffectiveFrom = today.AddDays(-1),
            EffectiveTo = today.AddDays(30),
            IsActive = true
        });

        db.TenantRelationships.Add(new TenantRelationship
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RelatedTenantId = externalTenantId,
            RelationshipType = TenantRelationshipType.DeliveryPartner,
            Status = TenantRelationshipStatus.Active,
            EffectiveFrom = today.AddDays(-1),
            EffectiveTo = today.AddDays(30),
            ScopeJson = "{\"canAssignPeople\":false}",
            IsActive = true
        });

        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(
            projectId,
            new CreateProjectAssignmentRequest
            {
                ConsultantId = consultantId,
                RoleTitle = "External Advisor",
                StartDate = today,
                EndDate = null,
                IsPrimaryAssignment = false,
                Notes = "Denied"
            });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
    }

    private static Guid SeedProject(AppDbContext db, Guid tenantId)
    {
        var projectId = Guid.NewGuid();
        db.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = Guid.NewGuid(),
            ProjectNumber = "PRJ-001",
            Name = "Security Test Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-10),
            Status = ProjectLifecycleStatus.Draft,
            IsActive = true
        });

        return projectId;
    }

    private static Guid SeedConsultant(AppDbContext db, Guid tenantId)
    {
        var consultantId = Guid.NewGuid();
        db.Consultants.Add(new Consultant
        {
            Id = consultantId,
            TenantId = tenantId,
            ConsultantNumber = "CON-001",
            FullName = "External Consultant",
            Email = "external@consulting.test",
            IsActive = true
        });

        return consultantId;
    }
}