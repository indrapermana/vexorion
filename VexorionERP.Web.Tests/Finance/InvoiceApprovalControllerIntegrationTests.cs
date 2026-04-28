using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class InvoiceApprovalControllerIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public InvoiceApprovalControllerIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SalesInvoice_RequestApproval_UnknownInvoice_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.Manage);

        var response = await client.PostAsJsonAsync(
            $"/api/sales-invoices/{Guid.NewGuid()}/approval/request",
            new ApprovalActionRequest { Comment = "Submit" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseInvoice_RequestApproval_UnknownInvoice_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.Manage);

        var response = await client.PostAsJsonAsync(
            $"/api/purchase-invoices/{Guid.NewGuid()}/approval/request",
            new ApprovalActionRequest { Comment = "Submit" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
