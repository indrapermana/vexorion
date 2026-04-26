using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts.Finance.Reporting;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Finance;

public class ReportingControllerIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReportingControllerIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Reports_ArAging_EmptyState_ReturnsReportEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/reports/ar-aging?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ArAgingReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.Items);
    }

    [Fact]
    public async Task Reports_ApAging_EmptyState_ReturnsReportEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/reports/ap-aging?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ApAgingReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.Items);
    }

    [Fact]
    public async Task Reports_TrialBalance_EmptyState_ReturnsReportEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/reports/trial-balance?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<TrialBalanceReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.Lines);
    }

    [Fact]
    public async Task Reports_Dashboard_EmptyState_ReturnsSnapshotEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/reports/dashboard?asOfDate=2026-04-30&periodDays=30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<FinanceDashboardSnapshotResponse>();
        Assert.NotNull(payload);
        Assert.Equal(0m, payload.ReceivablesOpen);
        Assert.Equal(0m, payload.PayablesOpen);
    }
}
