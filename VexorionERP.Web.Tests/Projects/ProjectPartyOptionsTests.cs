using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ProjectPartyOptionsTests
{
    [Theory]
    [InlineData(null, true, true, true)]
    [InlineData("{}", false, false, false)]
    [InlineData("{\"canViewDocuments\":true,\"canUploadDocuments\":false,\"canAssignPeople\":true}", true, false, true)]
    [InlineData("{\"canViewDocuments\":false,\"CanViewDocuments\":true,\"documentsUpload\":\"true\"}", false, true, false)]
    public async Task Options_ReturnOnlyEligibleOwnedRelationshipsAndExplicitPermissions(string? scope, bool view, bool upload, bool assign)
    {
        await using var factory = new PartyOptionsFactory();
        var seed = await Seed(factory, scope);
        using var client = factory.CreateClient();
        client.SetBearerToken(seed.Owner, AppPermissions.Projects.Manage);
        var response = await client.GetAsync($"/api/projects/{seed.Project}/parties/options");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var option = Assert.Single((await response.Content.ReadFromJsonAsync<List<ProjectPartyOptionResponse>>())!);
        Assert.Equal(seed.Partner, option.RelatedTenantId);
        Assert.Equal("PARTNER", option.RelatedTenantCode);
        Assert.Equal("Eligible Partner", option.RelatedTenantName);
        Assert.Equal(TenantRelationshipType.DeliveryPartner, option.RelationshipType);
        Assert.Equal(view, option.CanViewDocuments);
        Assert.Equal(upload, option.CanUploadDocuments);
        Assert.Equal(assign, option.CanAssignPeople);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("scopeJson", json);
        Assert.DoesNotContain("domain", json);
    }

    [Fact]
    public async Task Options_RequireProjectManageAndHideForeignProjects()
    {
        await using var factory = new PartyOptionsFactory();
        var seed = await Seed(factory, null);
        using var client = factory.CreateClient();
        var route = $"/api/projects/{seed.Project}/parties/options";
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(route)).StatusCode);
        client.SetBearerToken(seed.Owner, AppPermissions.Projects.View);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(route)).StatusCode);
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Projects.Manage);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(route)).StatusCode);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("[]")]
    [InlineData("42")]
    [InlineData("null")]
    public async Task NonObjectLegacyScope_DeniesPartyCreationInsteadOfThrowing(string scopeJson)
    {
        await using var factory = new PartyOptionsFactory();
        var seed = await Seed(factory, scopeJson);
        using var client = factory.CreateClient();
        client.SetBearerToken(seed.Owner, AppPermissions.Projects.Manage);
        var response = await client.PostAsJsonAsync($"/api/projects/{seed.Project}/parties", new CreateProjectPartyRequest
        {
            RelatedTenantId = seed.Partner, RelationshipType = TenantRelationshipType.DeliveryPartner,
            CanViewDocuments = false, CanUploadDocuments = false, CanAssignPeople = false,
        });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("[]")]
    [InlineData("42")]
    [InlineData("null")]
    public async Task Options_DoNotOfferMalformedRelationshipScopes(string scopeJson)
    {
        await using var factory = new PartyOptionsFactory();
        var seed = await Seed(factory, scopeJson);
        using var client = factory.CreateClient();
        client.SetBearerToken(seed.Owner, AppPermissions.Projects.Manage);
        var options = await client.GetFromJsonAsync<List<ProjectPartyOptionResponse>>($"/api/projects/{seed.Project}/parties/options");
        Assert.Empty(options!);
    }

    [Fact]
    public async Task PartyList_ReturnsReadableTenantLabelsForOwnedRows()
    {
        await using var factory = new PartyOptionsFactory();
        var seed = await Seed(factory, null);
        using var client = factory.CreateClient();
        client.SetBearerToken(seed.Owner, AppPermissions.Projects.View);
        var rows = await client.GetFromJsonAsync<List<ProjectPartyListItemResponse>>($"/api/projects/{seed.Project}/parties");
        var party = Assert.Single(rows!);
        Assert.Equal("PARTNER", party.RelatedTenantCode);
        Assert.Equal("Eligible Partner", party.RelatedTenantName);
    }

    private static async Task<(Guid Owner, Guid Partner, Guid Project)> Seed(PartyOptionsFactory factory, string? scopeJson)
    {
        var owner = Guid.NewGuid();
        var partner = Guid.NewGuid();
        var inactive = Guid.NewGuid();
        var foreign = Guid.NewGuid();
        var project = Guid.NewGuid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        using var serviceScope = factory.Services.CreateScope();
        var db = serviceScope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Tenants.AddRange(
            new Tenant { Id = owner, Code = "OWNER", Name = "Owner", IsActive = true },
            new Tenant { Id = partner, Code = "PARTNER", Name = "Eligible Partner", Domain = "private.invalid", IsActive = true },
            new Tenant { Id = inactive, Code = "INACTIVE", Name = "Inactive", IsActive = false },
            new Tenant { Id = foreign, Code = "FOREIGN", Name = "Foreign", IsActive = true });
        db.Projects.Add(new Project { Id = project, TenantId = owner, ProjectNumber = "P-OPTIONS", Name = "Options", StartDate = today, IsActive = true });
        db.ProjectParties.Add(new ProjectParty { Id = Guid.NewGuid(), TenantId = owner, ProjectId = project, RelatedTenantId = partner, RelationshipType = TenantRelationshipType.DeliveryPartner, IsActive = true });

        void Relationship(Guid tenantId, Guid target, TenantRelationshipType type, TenantRelationshipStatus status, DateOnly? from, DateOnly? to, bool active = true)
        {
            db.TenantRelationships.Add(new TenantRelationship
            {
                Id = Guid.NewGuid(), TenantId = tenantId, RelatedTenantId = target, RelationshipType = type,
                Status = status, EffectiveFrom = from, EffectiveTo = to, IsActive = active, ScopeJson = scopeJson,
            });
        }

        Relationship(owner, partner, TenantRelationshipType.DeliveryPartner, TenantRelationshipStatus.Active, today, today);
        Relationship(owner, partner, TenantRelationshipType.Vendor, TenantRelationshipStatus.Pending, null, null);
        Relationship(owner, partner, TenantRelationshipType.Customer, TenantRelationshipStatus.Active, today.AddDays(1), null);
        Relationship(owner, partner, TenantRelationshipType.ConsortiumMember, TenantRelationshipStatus.Active, null, today.AddDays(-1));
        Relationship(owner, partner, TenantRelationshipType.Subcontractor, TenantRelationshipStatus.Active, null, null, false);
        Relationship(owner, inactive, TenantRelationshipType.LegalSponsor, TenantRelationshipStatus.Active, null, null);
        Relationship(foreign, partner, TenantRelationshipType.PrimeContractor, TenantRelationshipStatus.Active, null, null);
        Relationship(owner, owner, TenantRelationshipType.PrimeContractor, TenantRelationshipStatus.Active, null, null);
        await db.SaveChangesAsync();
        return (owner, partner, project);
    }

    private sealed class PartyOptionsFactory : TestWebApplicationFactoryBase
    {
        private readonly string _databaseName = $"party-options-{Guid.NewGuid()}";
        protected override string GetDatabaseName() => _databaseName;
    }
}