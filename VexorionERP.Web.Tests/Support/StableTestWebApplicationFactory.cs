namespace VexorionERP.Web.Tests;

public sealed class StableTestWebApplicationFactory : TestWebApplicationFactoryBase
{
    private readonly string _databaseName = $"vexorion-web-tests-stable-{Guid.NewGuid()}";

    protected override string GetDatabaseName() => _databaseName;
}
