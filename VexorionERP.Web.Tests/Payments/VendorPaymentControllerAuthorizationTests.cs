using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts.Purchasing.Payments;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Payments;

public class VendorPaymentControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public VendorPaymentControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task VendorPayments_GetAll_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/vendor-payments");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task VendorPayments_GetAll_WithoutPurchasingViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.GetAsync("/api/vendor-payments");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task VendorPayments_GetAll_WithPurchasingViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync("/api/vendor-payments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<VendorPaymentListItemResponse>>();
        Assert.NotNull(payload);
    }

    [Fact]
    public async Task VendorPayments_Create_WithPurchasingViewOnly_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.PostAsJsonAsync("/api/vendor-payments", new CreateVendorPaymentRequest
        {
            SupplierId = Guid.NewGuid(),
            PurchaseInvoiceId = Guid.NewGuid(),
            PaymentDate = new DateOnly(2026, 4, 25),
            Amount = 10m,
            CurrencyCode = "USD",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}