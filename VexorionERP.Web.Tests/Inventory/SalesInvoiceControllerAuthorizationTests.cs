using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Inventory;

public class SalesInvoiceControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesInvoiceControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SalesInvoices_GetAll_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/sales-invoices");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SalesInvoices_GetAll_WithoutSalesViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync("/api/sales-invoices");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SalesInvoices_GetAll_WithSalesViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.GetAsync("/api/sales-invoices");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<SalesInvoiceListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task SalesInvoices_Create_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/sales-invoices", new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-TEST",
            CustomerId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SalesInvoices_Create_WithSalesViewOnly_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.PostAsJsonAsync("/api/sales-invoices", new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-TEST",
            CustomerId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SalesInvoices_Create_WithSalesManagePermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.Manage);

        var response = await client.PostAsJsonAsync("/api/sales-invoices", new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-TEST",
            CustomerId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SalesInvoices_Delete_WithSalesManagePermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.Manage);

        var response = await client.DeleteAsync($"/api/sales-invoices/{Guid.NewGuid()}");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SalesInvoiceLines_GetAll_WithSalesViewPermission_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.GetAsync($"/api/sales-invoices/{Guid.NewGuid()}/lines");

        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SalesInvoiceLines_Create_WithoutSalesManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.PostAsJsonAsync($"/api/sales-invoices/{Guid.NewGuid()}/lines", new CreateSalesInvoiceLineRequest
        {
            ProductId = Guid.NewGuid(),
            Quantity = 1m,
            UnitPrice = 10m,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
