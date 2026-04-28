namespace VexorionERP.Web.Tests;

public sealed class TestWebApplicationFactory : TestWebApplicationFactoryBase
{
    protected override string GetDatabaseName() => $"vexorion-web-tests-{Guid.NewGuid()}";
}
