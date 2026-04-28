using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class PaymentControllerValidationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PaymentControllerValidationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CustomerPayments_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.Manage);

        var response = await client.PostAsJsonAsync("/api/customer-payments", new CreateCustomerPaymentRequest
        {
            CustomerId = Guid.NewGuid(),
            SalesInvoiceId = Guid.NewGuid(),
            PaymentDate = new DateOnly(2026, 4, 25),
            Amount = 0m,
            CurrencyCode = "US",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreateCustomerPaymentRequest.Amount), problem.Errors.Keys);
        Assert.Contains(nameof(CreateCustomerPaymentRequest.CurrencyCode), problem.Errors.Keys);
    }

    [Fact]
    public async Task VendorPayments_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.Manage);

        var response = await client.PostAsJsonAsync("/api/vendor-payments", new CreateVendorPaymentRequest
        {
            SupplierId = Guid.NewGuid(),
            PurchaseInvoiceId = Guid.NewGuid(),
            PaymentDate = new DateOnly(2026, 4, 25),
            Amount = 0m,
            CurrencyCode = "US",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreateVendorPaymentRequest.Amount), problem.Errors.Keys);
        Assert.Contains(nameof(CreateVendorPaymentRequest.CurrencyCode), problem.Errors.Keys);
    }
}
