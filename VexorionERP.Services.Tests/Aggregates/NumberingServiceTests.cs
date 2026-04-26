using VexorionERP.Contracts.Finance.Numbering;
using VexorionERP.Models.Enums;
using VexorionERP.Services;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class NumberingServiceTests
{
    [Fact]
    public async Task GenerateNext_WithDefaultSalesInvoiceSequence_ReturnsMonthlyNumber()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        var service = new NumberingService(dbContext, new FixedTenantProvider(tenantId));

        var first = await service.GenerateNextAsync("SALES_INVOICE", new DateOnly(2026, 4, 26));
        var second = await service.GenerateNextAsync("SALES_INVOICE", new DateOnly(2026, 4, 27));

        Assert.True(first.Succeeded);
        Assert.True(second.Succeeded);
        Assert.Equal("SI-202604-0001", first.Value);
        Assert.Equal("SI-202604-0002", second.Value);
    }

    [Fact]
    public async Task GenerateNext_WithMonthlyReset_ResetsOnNewMonth()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        var service = new NumberingService(dbContext, new FixedTenantProvider(tenantId));

        await service.UpsertAsync(new UpsertNumberingSequenceRequest
        {
            DocumentType = "SALES_INVOICE",
            PrefixTemplate = "SI-{yyyyMM}-",
            NextNumber = 1,
            NumberPadding = 4,
            ResetPeriod = NumberingResetPeriod.Monthly,
        });

        var april = await service.GenerateNextAsync("SALES_INVOICE", new DateOnly(2026, 4, 30));
        var may = await service.GenerateNextAsync("SALES_INVOICE", new DateOnly(2026, 5, 1));

        Assert.True(april.Succeeded);
        Assert.True(may.Succeeded);
        Assert.Equal("SI-202604-0001", april.Value);
        Assert.Equal("SI-202605-0001", may.Value);
    }

    [Fact]
    public async Task Upsert_UpdatesExistingSequence()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        var service = new NumberingService(dbContext, new FixedTenantProvider(tenantId));

        var upsert = await service.UpsertAsync(new UpsertNumberingSequenceRequest
        {
            DocumentType = "JOURNAL_ENTRY",
            PrefixTemplate = "JE-{yyyy}-",
            NextNumber = 42,
            NumberPadding = 5,
            ResetPeriod = NumberingResetPeriod.Yearly,
        });

        var generated = await service.GenerateNextAsync("JOURNAL_ENTRY", new DateOnly(2026, 12, 1));

        Assert.True(upsert.Succeeded);
        Assert.True(generated.Succeeded);
        Assert.Equal("JE-2026-00042", generated.Value);
    }
}
