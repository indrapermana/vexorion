using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Inventory;

public class SalesInvoiceControllerValidationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesInvoiceControllerValidationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SalesInvoices_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.Manage);

        var response = await client.PostAsJsonAsync("/api/sales-invoices", new CreateSalesInvoiceRequest
        {
            InvoiceNumber = string.Empty,
            CustomerId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "US",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreateSalesInvoiceRequest.InvoiceNumber), problem.Errors.Keys);
        Assert.Contains(nameof(CreateSalesInvoiceRequest.CurrencyCode), problem.Errors.Keys);
    }

    [Fact]
    public async Task SalesInvoiceLines_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Sales.Manage);

        var response = await client.PostAsJsonAsync($"/api/sales-invoices/{Guid.NewGuid()}/lines", new CreateSalesInvoiceLineRequest
        {
            ProductId = Guid.NewGuid(),
            Quantity = 0m,
            UnitPrice = -1m,
            DiscountAmount = -1m,
            TaxAmount = -1m,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreateSalesInvoiceLineRequest.Quantity), problem.Errors.Keys);
        Assert.Contains(nameof(CreateSalesInvoiceLineRequest.UnitPrice), problem.Errors.Keys);
        Assert.Contains(nameof(CreateSalesInvoiceLineRequest.DiscountAmount), problem.Errors.Keys);
        Assert.Contains(nameof(CreateSalesInvoiceLineRequest.TaxAmount), problem.Errors.Keys);
    }
}