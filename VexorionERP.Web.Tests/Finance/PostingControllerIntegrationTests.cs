using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class PostingControllerIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PostingControllerIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Posting_SalesInvoice_WithUnknownInvoice_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage);

        var response = await client.PostAsJsonAsync($"/api/posting/sales-invoices/{Guid.NewGuid()}", new PostSalesInvoiceRequest
        {
            ReceivableAccountId = Guid.NewGuid(),
            RevenueAccountId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 26),
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Posting_PurchaseInvoice_WithUnknownInvoice_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage);

        var response = await client.PostAsJsonAsync($"/api/posting/purchase-invoices/{Guid.NewGuid()}", new PostPurchaseInvoiceRequest
        {
            PayableAccountId = Guid.NewGuid(),
            ExpenseAccountId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 26),
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Posting_CustomerPayment_WithUnknownPayment_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage);

        var response = await client.PostAsJsonAsync($"/api/posting/customer-payments/{Guid.NewGuid()}", new PostCustomerPaymentRequest
        {
            CashAccountId = Guid.NewGuid(),
            ReceivableAccountId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 26),
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Posting_VendorPayment_WithUnknownPayment_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage);

        var response = await client.PostAsJsonAsync($"/api/posting/vendor-payments/{Guid.NewGuid()}", new PostVendorPaymentRequest
        {
            PayableAccountId = Guid.NewGuid(),
            CashAccountId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 26),
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
