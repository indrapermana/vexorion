using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class CrossTenantPermissionBoundaryIntegrationTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public CrossTenantPermissionBoundaryIntegrationTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetProjectById_WhenProjectBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantB, AppPermissions.Projects.View);

        var response = await client.GetAsync($"/api/projects/{seed.ProjectId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDocumentById_WhenDocumentBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantB, AppPermissions.ProjectDocuments.View);

        var response = await client.GetAsync($"/api/projects/{seed.ProjectId}/documents/{seed.DocumentId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateAssignment_WhenProjectBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantB, AppPermissions.Projects.Manage);

        var response = await client.PostAsJsonAsync(
            $"/api/projects/{seed.ProjectId}/assignments",
            new CreateProjectAssignmentRequest
            {
                EmployeeId = Guid.NewGuid(),
                RoleTitle = "Boundary check",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                EndDate = null,
                IsPrimaryAssignment = false,
                Notes = "cross-tenant"
            });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ForeignTenant_ObjectMatrix_HidesListsAndDeniesReadUpdateDeleteWithoutMutation()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);
        var tenantBCategoryId = Guid.NewGuid();
        var tenantBCustomerId = Guid.NewGuid();
        var tenantBWarehouseId = Guid.NewGuid();
        using (var setupScope = _factory.Services.CreateScope())
        {
            var setupDb = setupScope.ServiceProvider.GetRequiredService<AppDbContext>();
            setupDb.ProjectCategories.Add(new ProjectCategory
            {
                Id = tenantBCategoryId,
                TenantId = tenantB,
                Code = "BOUNDARY",
                Name = "Boundary category"
            });
            setupDb.Customers.Add(new Customer
            {
                Id = tenantBCustomerId,
                TenantId = tenantB,
                CustomerNumber = "TENANT-B-CUSTOMER",
                Name = "Tenant B Customer",
                IsActive = true
            });
            setupDb.Warehouses.Add(new Warehouse
            {
                Id = tenantBWarehouseId,
                TenantId = tenantB,
                Code = "BOUNDARY",
                Name = "Boundary warehouse",
                IsActive = true
            });
            await setupDb.SaveChangesAsync();
        }
        var client = _factory.CreateClient();
        client.SetBearerToken(
            tenantB,
            AppPermissions.Customers.View, AppPermissions.Customers.Manage,
            AppPermissions.Products.View, AppPermissions.Products.Manage,
            AppPermissions.Projects.View, AppPermissions.Projects.Manage,
            AppPermissions.ProjectDocuments.View, AppPermissions.ProjectDocuments.Manage,
            AppPermissions.Sales.View, AppPermissions.Sales.Manage);

        var customers = await client.GetFromJsonAsync<List<CustomerListItemResponse>>("/api/customers");
        var products = await client.GetFromJsonAsync<List<ProductListItemResponse>>("/api/products");
        var projects = await client.GetFromJsonAsync<List<ProjectListItemResponse>>("/api/projects");
        var salesOrders = await client.GetFromJsonAsync<List<SalesOrderListItemResponse>>("/api/sales-orders");
        Assert.DoesNotContain(customers!, item => item.Id == seed.CustomerId);
        Assert.DoesNotContain(products!, item => item.Id == seed.ProductId);
        Assert.DoesNotContain(projects!, item => item.Id == seed.ProjectId);
        Assert.DoesNotContain(salesOrders!, item => item.Id == seed.SalesOrderId);

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/customers/{seed.CustomerId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/customers/{seed.CustomerId}", new UpdateCustomerRequest
        {
            CustomerNumber = "FOREIGN-CHANGED", Name = "Foreign changed", IsActive = true
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/customers/{seed.CustomerId}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/products/{seed.ProductId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/products/{seed.ProductId}", new UpdateProductRequest
        {
            Sku = "FOREIGN-CHANGED", Name = "Foreign changed", UnitOfMeasure = "EA", IsActive = true
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/products/{seed.ProductId}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/projects/{seed.ProjectId}", new UpdateProjectRequest
        {
            ProjectCategoryId = tenantBCategoryId,
            ProjectNumber = "FOREIGN-CHANGED",
            Name = "Foreign changed",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft,
            IsActive = true
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/projects/{seed.ProjectId}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync(
            $"/api/projects/{seed.ProjectId}/documents/{seed.DocumentId}",
            new UpdateProjectDocumentRequest { Title = "Foreign changed" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync(
            $"/api/projects/{seed.ProjectId}/documents/{seed.DocumentId}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/sales-orders/{seed.SalesOrderId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/sales-orders/{seed.SalesOrderId}", new UpdateSalesOrderRequest
        {
            OrderNumber = "FOREIGN-CHANGED",
            CustomerId = tenantBCustomerId,
            WarehouseId = tenantBWarehouseId,
            OrderDate = DateOnly.FromDateTime(DateTime.UtcNow),
            RequiredDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            IsActive = true
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/sales-orders/{seed.SalesOrderId}")).StatusCode);

        using var verificationScope = _factory.Services.CreateScope();
        var db = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("Tenant A Customer", (await db.Customers.IgnoreQueryFilters().SingleAsync(x => x.Id == seed.CustomerId)).Name);
        Assert.Equal("Tenant A Product", (await db.Products.IgnoreQueryFilters().SingleAsync(x => x.Id == seed.ProductId)).Name);
        Assert.Equal("Tenant A Project", (await db.Projects.IgnoreQueryFilters().SingleAsync(x => x.Id == seed.ProjectId)).Name);
        Assert.Equal("Restricted Document", (await db.ProjectDocuments.IgnoreQueryFilters().SingleAsync(x => x.Id == seed.DocumentId)).Title);
        Assert.Equal("Tenant A Sales Order", (await db.SalesOrders.IgnoreQueryFilters().SingleAsync(x => x.Id == seed.SalesOrderId)).Notes);
        var denialAudits = await db.AuditLogs
            .Where(x => x.TenantId == tenantB && x.EventType == "authorization.access_denied")
            .ToListAsync();
        Assert.Contains(denialAudits, x => x.Description?.Contains($"/api/customers/{seed.CustomerId}", StringComparison.Ordinal) == true);
        Assert.Contains(denialAudits, x => x.Description?.Contains($"/api/sales-orders/{seed.SalesOrderId}", StringComparison.Ordinal) == true);
    }

    private async Task<(Guid CategoryId, Guid ProjectId, Guid DocumentId, Guid CustomerId, Guid ProductId, Guid SalesOrderId)> SeedTenantProjectDocumentAsync(Guid tenantId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var categoryId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var documentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var salesOrderId = Guid.NewGuid();

        dbContext.ProjectCategories.Add(new ProjectCategory
        {
            Id = categoryId,
            TenantId = tenantId,
            Code = "GEN",
            Name = "General"
        });

        dbContext.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = categoryId,
            ProjectNumber = $"PRJ-{projectId.ToString("N")[..8].ToUpperInvariant()}",
            Name = "Tenant A Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft
        });

        dbContext.ProjectDocuments.Add(new ProjectDocument
        {
            Id = documentId,
            TenantId = tenantId,
            ProjectId = projectId,
            DocumentNumber = "DOC-BOUNDARY-1",
            Title = "Restricted Document",
            FileName = "restricted.pdf",
            ContentType = "application/pdf",
            StoragePath = "restricted/restricted.pdf",
            FileSizeBytes = 100,
            CurrentVersionNumber = 1,
            Status = ManagedDocumentStatus.Draft,
            IsActive = true
        });

        dbContext.Customers.Add(new Customer
        {
            Id = customerId,
            TenantId = tenantId,
            CustomerNumber = "TENANT-A-CUSTOMER",
            Name = "Tenant A Customer",
            IsActive = true
        });

        dbContext.Products.Add(new Product
        {
            Id = productId,
            TenantId = tenantId,
            Sku = "TENANT-A-PRODUCT",
            Name = "Tenant A Product",
            UnitOfMeasure = "EA",
            IsActive = true
        });

        dbContext.Warehouses.Add(new Warehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            Code = "TENANT-A-WAREHOUSE",
            Name = "Tenant A Warehouse",
            IsActive = true
        });

        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = salesOrderId,
            TenantId = tenantId,
            OrderNumber = "TENANT-A-SALES-ORDER",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = DateOnly.FromDateTime(DateTime.UtcNow),
            RequiredDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            Notes = "Tenant A Sales Order",
            IsActive = true
        });

        await dbContext.SaveChangesAsync();
        return (categoryId, projectId, documentId, customerId, productId, salesOrderId);
    }
}
