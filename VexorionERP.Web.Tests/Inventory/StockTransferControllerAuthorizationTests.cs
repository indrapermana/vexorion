using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Inventory.Transfers;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Inventory;

public class StockTransferControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public StockTransferControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task StockTransfers_GetAll_WithoutInventoryViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.Manage);

        var response = await client.GetAsync("/api/stock-transfers");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task StockTransfers_GetAll_WithInventoryViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync("/api/stock-transfers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<StockTransferListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task StockTransferLines_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.Manage);

        var response = await client.PostAsJsonAsync($"/api/stock-transfers/{Guid.NewGuid()}/lines", new CreateStockTransferLineRequest
        {
            ProductId = Guid.Empty,
            Quantity = 0,
            UnitCost = -1,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreateStockTransferLineRequest.Quantity), problem.Errors.Keys);
        Assert.Contains(nameof(CreateStockTransferLineRequest.UnitCost), problem.Errors.Keys);
    }
}