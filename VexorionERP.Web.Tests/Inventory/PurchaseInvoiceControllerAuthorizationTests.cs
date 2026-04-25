using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Inventory;

public class PurchaseInvoiceControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PurchaseInvoiceControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PurchaseInvoices_GetAll_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/purchase-invoices");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoices_GetAll_WithoutPurchasingViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.GetAsync("/api/purchase-invoices");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoices_GetAll_WithPurchasingViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync("/api/purchase-invoices");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<PurchaseInvoiceListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task PurchaseInvoices_Create_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/purchase-invoices", new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-TEST",
            SupplierId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoices_Create_WithPurchasingViewOnly_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.PostAsJsonAsync("/api/purchase-invoices", new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-TEST",
            SupplierId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoices_Create_WithPurchasingManagePermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.Manage);

        var response = await client.PostAsJsonAsync("/api/purchase-invoices", new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-TEST",
            SupplierId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoices_Delete_WithPurchasingManagePermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.Manage);

        var response = await client.DeleteAsync($"/api/purchase-invoices/{Guid.NewGuid()}");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoiceLines_GetAll_WithPurchasingViewPermission_ReturnsOkOrNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync($"/api/purchase-invoices/{Guid.NewGuid()}/lines");

        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PurchaseInvoiceLines_Create_WithoutPurchasingManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.PostAsJsonAsync($"/api/purchase-invoices/{Guid.NewGuid()}/lines", new CreatePurchaseInvoiceLineRequest
        {
            ProductId = Guid.NewGuid(),
            Quantity = 1m,
            UnitCost = 10m,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
