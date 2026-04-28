using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class FinanceControllerIntegrationTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public FinanceControllerIntegrationTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Accounts_CreateThenGetById_ReturnsCreatedAccount()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage, AppPermissions.Billing.View);

        var createResponse = await client.PostAsJsonAsync("/api/accounts", new CreateAccountRequest
        {
            Code = "1100",
            Name = "Accounts Receivable",
            AccountType = AccountType.Asset,
            NormalBalance = NormalBalanceType.Debit,
            IsPostingAllowed = true,
            IsActive = true,
            Description = "AR control account",
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<AccountDetailsResponse>();
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal("1100", created.Code);
        Assert.Equal("Accounts Receivable", created.Name);

        var getResponse = await client.GetAsync($"/api/accounts/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var fetched = await getResponse.Content.ReadFromJsonAsync<AccountDetailsResponse>();
        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched.Id);
        Assert.Equal(created.Description, fetched.Description);
    }

    [Fact]
    public async Task FiscalPeriods_CreateCloseReopen_WorksAcrossRequests()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage, AppPermissions.Billing.View);

        var createResponse = await client.PostAsJsonAsync("/api/fiscal-periods", new CreateFiscalPeriodRequest
        {
            PeriodCode = "2026-04",
            StartDate = new DateOnly(2026, 4, 1),
            EndDate = new DateOnly(2026, 4, 30),
            IsClosed = false,
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<FiscalPeriodDetailsResponse>();
        Assert.NotNull(created);
        Assert.False(created.IsClosed);

        var closeResponse = await client.PostAsync($"/api/fiscal-periods/{created.Id}/close", content: null);
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);

        var closed = await closeResponse.Content.ReadFromJsonAsync<FiscalPeriodDetailsResponse>();
        Assert.NotNull(closed);
        Assert.True(closed.IsClosed);
        Assert.NotNull(closed.ClosedAtUtc);

        var reopenResponse = await client.PostAsync($"/api/fiscal-periods/{created.Id}/reopen", content: null);
        Assert.Equal(HttpStatusCode.OK, reopenResponse.StatusCode);

        var reopened = await reopenResponse.Content.ReadFromJsonAsync<FiscalPeriodDetailsResponse>();
        Assert.NotNull(reopened);
        Assert.False(reopened.IsClosed);
        Assert.Null(reopened.ClosedAtUtc);
    }

    [Fact]
    public async Task FiscalPeriods_Create_WithInvalidRange_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.Manage, AppPermissions.Billing.View);

        var createResponse = await client.PostAsJsonAsync("/api/fiscal-periods", new CreateFiscalPeriodRequest
        {
            PeriodCode = "2026-05",
            StartDate = new DateOnly(2026, 5, 31),
            EndDate = new DateOnly(2026, 5, 1),
            IsClosed = false,
        });

        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
    }
}
