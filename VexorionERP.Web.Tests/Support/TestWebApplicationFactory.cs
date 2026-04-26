namespace VexorionERP.Web.Tests.Support;

public sealed class TestWebApplicationFactory : TestWebApplicationFactoryBase
{
    protected override string GetDatabaseName() => $"vexorion-web-tests-{Guid.NewGuid()}";
}