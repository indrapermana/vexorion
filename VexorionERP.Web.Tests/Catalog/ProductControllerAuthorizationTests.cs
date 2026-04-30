using System.Net;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ProductControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ProductControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Products_PurchasePriceHistory_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Products_PurchasePriceHistory_WithoutProductsViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Products_PurchasePriceHistory_WithProductsViewPermission_ReturnsNotFoundForUnknownProduct()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Products.View);

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Products_PurchasePriceHistoryEntries_WithoutProductsViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history/entries");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Products_PurchasePriceHistoryEntries_WithProductsViewPermission_ReturnsNotFoundForUnknownProduct()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Products.View);

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history/entries?supplierId={Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Products_PurchasePriceSummary_WithoutProductsViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history/summary");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Products_PurchasePriceSummary_WithProductsViewPermission_ReturnsNotFoundForUnknownProduct()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Products.View);

        var response = await client.GetAsync($"/api/products/{Guid.NewGuid()}/purchase-price-history/summary?fromDate=2026-04-01&toDate=2026-04-30");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

