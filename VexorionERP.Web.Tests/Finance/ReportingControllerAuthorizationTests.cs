using System.Net;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ReportingControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReportingControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Reports_ArAging_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/reports/ar-aging");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Reports_ArAging_WithoutBillingView_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync("/api/reports/ar-aging");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Reports_TrialBalance_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/trial-balance");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_Dashboard_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/dashboard");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_ProfitAndLoss_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/profit-and-loss");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_BalanceSheet_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/balance-sheet");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_BalanceSheet_WithPriorPeriodAndBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/balance-sheet?asOfDate=2026-04-30&priorAsOfDate=2026-03-31");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_ProfitAndLossExport_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/profit-and-loss/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_ProfitAndLossExport_WithPriorPeriod_IncludesComparativeSummary()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/profit-and-loss/export?startDate=2026-10-01&endDate=2026-10-26&priorStartDate=2026-09-01&priorEndDate=2026-09-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var csv = await response.Content.ReadAsStringAsync();
        Assert.Contains("Prior Revenue Total", csv);
        Assert.Contains("Net Income Variance", csv);
    }

    [Fact]
    public async Task Reports_BalanceSheetExport_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/balance-sheet/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_BalanceSheetExport_WithPriorPeriod_IncludesComparativeSummary()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/balance-sheet/export?asOfDate=2026-10-26&priorAsOfDate=2026-09-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var csv = await response.Content.ReadAsStringAsync();
        Assert.Contains("Prior Total Assets", csv);
        Assert.Contains("Equity Variance", csv);
    }

    [Fact]
    public async Task Reports_TrialBalanceExport_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/trial-balance/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_AccountDrillDown_WithBillingView_ReturnsNotFoundForUnknownAccount()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync($"/api/reports/account-drill-down/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Reports_AccountDrillDownExport_WithBillingView_ReturnsNotFoundForUnknownAccount()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync($"/api/reports/account-drill-down/{Guid.NewGuid()}/export");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
