using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Inventory;

public class PurchaseInvoiceControllerValidationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PurchaseInvoiceControllerValidationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PurchaseInvoices_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.Manage);

        var response = await client.PostAsJsonAsync("/api/purchase-invoices", new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = string.Empty,
            SupplierId = Guid.NewGuid(),
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "US",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreatePurchaseInvoiceRequest.InvoiceNumber), problem.Errors.Keys);
        Assert.Contains(nameof(CreatePurchaseInvoiceRequest.CurrencyCode), problem.Errors.Keys);
    }

    [Fact]
    public async Task PurchaseInvoiceLines_Create_WithInvalidPayload_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Purchasing.Manage);

        var response = await client.PostAsJsonAsync($"/api/purchase-invoices/{Guid.NewGuid()}/lines", new CreatePurchaseInvoiceLineRequest
        {
            ProductId = Guid.NewGuid(),
            Quantity = 0m,
            UnitCost = -1m,
            DiscountAmount = -1m,
            TaxAmount = -1m,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(CreatePurchaseInvoiceLineRequest.Quantity), problem.Errors.Keys);
        Assert.Contains(nameof(CreatePurchaseInvoiceLineRequest.UnitCost), problem.Errors.Keys);
        Assert.Contains(nameof(CreatePurchaseInvoiceLineRequest.DiscountAmount), problem.Errors.Keys);
        Assert.Contains(nameof(CreatePurchaseInvoiceLineRequest.TaxAmount), problem.Errors.Keys);
    }
}