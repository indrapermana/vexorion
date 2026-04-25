using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts.Sales.Payments;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Payments;

public class CustomerPaymentControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public CustomerPaymentControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CustomerPayments_GetAll_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/customer-payments");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CustomerPayments_GetAll_WithoutSalesViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.View);

        var response = await client.GetAsync("/api/customer-payments");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CustomerPayments_GetAll_WithSalesViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.GetAsync("/api/customer-payments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<CustomerPaymentListItemResponse>>();
        Assert.NotNull(payload);
    }

    [Fact]
    public async Task CustomerPayments_Create_WithSalesViewOnly_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.View);

        var response = await client.PostAsJsonAsync("/api/customer-payments", new CreateCustomerPaymentRequest
        {
            CustomerId = Guid.NewGuid(),
            SalesInvoiceId = Guid.NewGuid(),
            PaymentDate = new DateOnly(2026, 4, 25),
            Amount = 10m,
            CurrencyCode = "USD",
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}